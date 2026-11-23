import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/openingResources.js', import.meta.url), 'utf8')
const asModule = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const dependencies = {
  './assetPaths': asModule("export const assetUrl = source => '/portfolio' + source"),
  './preparedImages': asModule('export const prepareImage = source => globalThis.__openingResourcesTest.prepareImage(source)'),
  './effectModules': asModule('export const effectPreparationTasks = () => globalThis.__openingResourcesTest.effectTasks'),
}
let injected = source
for (const [name, url] of Object.entries(dependencies)) {
  injected = injected.replace(new RegExp(`(['"])${name.replaceAll('.', '\\.')}\\1`), JSON.stringify(url))
}
const { openingPreparation } = await import(asModule(injected))
const previous = { document: globalThis.document, raf: globalThis.requestAnimationFrame, scenario: globalThis.__openingResourcesTest }
const baseURI = 'https://example.test/portfolio/'
const fullUrl = value => new URL('/portfolio' + value, baseURI).href
const placeholder = 'data:image/webp;base64,AAAA'
let scenario
let frames

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const observe = promise => {
  const state = { settled: false, error: null }
  state.promise = promise.then(() => { state.settled = true }, error => { state.settled = true; state.error = error })
  return state
}
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
const frame = async () => {
  await flush()
  const callbacks = frames.splice(0)
  assert.ok(callbacks.length, 'a real paint boundary should be pending')
  callbacks.forEach(callback => callback(0))
  await flush()
}
const twoFrames = async () => { await frame(); await frame() }

class ImageNode extends EventTarget {
  constructor(src, { attribute = fullUrl(src), current = fullUrl(src), decode = () => Promise.resolve(), complete = true, width = 240 } = {}) {
    super()
    this.dataset = { mediaSrc: src }
    this.attribute = attribute
    this.currentSrc = current
    this.complete = complete
    this.naturalWidth = width
    this.decodes = 0
    this.decode = () => { this.decodes++; return decode() }
  }
  getAttribute(name) { assert.equal(name, 'src'); return this.attribute }
}

beforeEach(() => {
  frames = []
  scenario = { images: [], effectTasks: [], prepared: [], prepareImage(source) { this.prepared.push(source); return Promise.resolve() } }
  globalThis.__openingResourcesTest = scenario
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length }
  const fonts = []
  fonts.ready = Promise.resolve()
  globalThis.document = {
    baseURI,
    fonts,
    querySelectorAll(selector) {
      assert.equal(selector, '#root img[data-media-src]', 'only real display images belong in this preparation')
      return scenario.images
    },
  }
})
afterEach(() => {
  for (const [name, value] of Object.entries({ document: previous.document, requestAnimationFrame: previous.raf, __openingResourcesTest: previous.scenario })) {
    if (value === undefined) delete globalThis[name]
    else globalThis[name] = value
  }
})

test('resource tasks deduplicate repeated covers, retain eligible effects and exclude non-image media', async () => {
  scenario.images = [new ImageNode('/images/one.webp'), new ImageNode('/images/one.webp'), new ImageNode('/images/two.webp')]
  let effects = 0
  scenario.effectTasks = [{ id: 'threads', run: async () => effects++ }]
  const preparation = openingPreparation()
  assert.deepEqual(preparation.tasks.map(task => task.id), ['image:/images/one.webp', 'image:/images/two.webp', 'threads'])
  assert.ok(preparation.tasks.every(task => !/\.mp4(?:\?|$)/.test(task.id)))
  await Promise.all(preparation.tasks.map(task => task.run()))
  assert.deepEqual(scenario.prepared, ['/images/one.webp', '/images/two.webp'])
  assert.equal(effects, 1)
  scenario.images = []
  assert.throws(openingPreparation, /images are not mounted/)
})

test('a decoded tiny placeholder cannot satisfy either the src check or the currentSrc check', async () => {
  for (const options of [{ attribute: placeholder, current: placeholder }, { current: placeholder }]) {
    const image = new ImageNode('/images/cover.webp', options)
    scenario.images = [image]
    const state = observe(openingPreparation().finalize())
    await twoFrames()
    await state.promise
    assert.match(state.error?.message || '', /placeholder|not decoded/)
    assert.equal(image.decodes, options.attribute ? 0 : 1)
    assert.equal(frames.length, 0, 'failed validation must not proceed to its final paint')
  }
})

test('full src attributes do not finish preparation until every real image decode and the final paint complete', async () => {
  const first = deferred()
  const second = deferred()
  const firstImage = new ImageNode('/images/one.webp', { decode: () => first.promise })
  const secondImage = new ImageNode('/images/two.webp', { decode: () => second.promise })
  scenario.images = [firstImage, secondImage]
  const state = observe(openingPreparation().finalize())
  assert.equal(firstImage.decodes, 0)
  await twoFrames()
  assert.equal(firstImage.decodes, 1)
  assert.equal(secondImage.decodes, 1)
  assert.equal(state.settled, false)
  first.resolve()
  await flush()
  assert.equal(state.settled, false)
  second.resolve()
  await flush()
  assert.equal(state.settled, false)
  assert.equal(frames.length, 1, 'a final real paint must follow successful image validation')
  await frame()
  await state.promise
  assert.equal(state.error, null)
  assert.equal(state.settled, true)
})

test('decode rejection, zero-width pixels and incomplete images reject actual display readiness', async () => {
  const failures = [
    { decode: () => Promise.reject(new Error('corrupt image')) },
    { width: 0 },
    { complete: false },
  ]
  for (const options of failures) {
    scenario.images = [new ImageNode('/images/good.webp'), new ImageNode('/images/broken.webp', options)]
    const state = observe(openingPreparation().finalize())
    await twoFrames()
    await state.promise
    assert.match(state.error?.message || '', /corrupt image|not decoded/)
    assert.equal(frames.length, 0)
  }
})

test('font readiness must resolve and a font error still rejects otherwise decoded content', async () => {
  scenario.images = [new ImageNode('/images/good.webp')]
  const pendingFont = deferred()
  const fonts = [{ status: 'loading' }]
  fonts.ready = pendingFont.promise
  document.fonts = fonts
  const state = observe(openingPreparation().finalize())
  await twoFrames()
  assert.equal(state.settled, false)
  assert.equal(frames.length, 0)
  fonts[0].status = 'loaded'
  pendingFont.resolve()
  await flush()
  assert.equal(state.settled, false)
  await frame()
  await state.promise
  assert.equal(state.error, null)

  document.fonts = Object.assign([{ status: 'error' }], { ready: Promise.resolve() })
  const failed = observe(openingPreparation().finalize())
  await twoFrames()
  await failed.promise
  assert.match(failed.error?.message || '', /font did not load/)
  assert.equal(frames.length, 0)
})

test('a duplicate DOM cover that has not swapped to its full source blocks success despite a prepared shared URL', async () => {
  const full = new ImageNode('/images/repeated.webp')
  const duplicate = new ImageNode('/images/repeated.webp', { attribute: placeholder, current: placeholder })
  scenario.images = [full, duplicate]
  const preparation = openingPreparation()
  assert.equal(preparation.tasks.length, 1)
  await preparation.tasks[0].run()
  const blocked = observe(preparation.finalize())
  await twoFrames()
  await blocked.promise
  assert.match(blocked.error?.message || '', /placeholder/)

  duplicate.attribute = fullUrl(duplicate.dataset.mediaSrc)
  duplicate.currentSrc = duplicate.attribute
  const retried = observe(preparation.finalize())
  await twoFrames()
  assert.equal(retried.settled, false)
  await frame()
  await retried.promise
  assert.equal(retried.error, null)
})
