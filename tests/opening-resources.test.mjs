import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import fs from 'node:fs'
import packs from '../src/displayPackManifest.js'
import { placeholderFor } from '../src/posterPlaceholders.js'

const source = fs.readFileSync(new URL('../src/openingResources.js', import.meta.url), 'utf8')
const asModule = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const dependencies = {
  './assetPaths': new URL('../src/assetPaths.js', import.meta.url).href,
  './preparedImages': asModule(
    'export const prepareImage = source => globalThis.__openingResourcesTest.prepareImage(source);' +
    'export const preparedImageSource = source => globalThis.__openingResourcesTest.preparedUrls.get(source);'
  ),
  './posterPlaceholders': new URL('../src/posterPlaceholders.js', import.meta.url).href,
}
let injected = source
for (const [name, url] of Object.entries(dependencies)) {
  injected = injected.replace("'" + name + "'", JSON.stringify(url))
}
const { openingPreparation } = await import(asModule(injected))
const previous = {
  document: globalThis.document,
  raf: globalThis.requestAnimationFrame,
  scenario: globalThis.__openingResourcesTest,
}
const baseURI = 'https://example.test/portfolio/'
const homeSources = packs.find(pack => pack.group === 'home').images.map(image => image.source)
const allSources = packs.flatMap(pack => pack.images.map(image => image.source))
const cover = homeSources.find(source => source !== '/mark.svg')
const farSource = allSources.find(source => !homeSources.includes(source))
const blobUrl = source => 'blob:https://example.test/' + encodeURIComponent(source)
let scenario
let frames

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const observe = promise => {
  const state = { settled: false, error: null }
  state.promise = promise.then(
    () => { state.settled = true },
    error => { state.settled = true; state.error = error },
  )
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
  constructor(source, {
    home = homeSources.includes(source) && source !== '/mark.svg',
    attribute = placeholderFor(source),
    current = attribute,
    decode = () => Promise.resolve(),
    complete = true,
    width = 96,
  } = {}) {
    super()
    this.dataset = { mediaSrc: source }
    this.home = home
    this.attribute = attribute
    this.currentSrc = current
    this.complete = complete
    this.naturalWidth = width
    this.decodes = 0
    this.decode = () => { this.decodes++; return decode() }
  }
  closest(selector) { assert.equal(selector, '#home'); return this.home ? { id: 'home' } : null }
  getAttribute(name) { assert.equal(name, 'src'); return this.attribute ?? null }
}

beforeEach(() => {
  frames = []
  scenario = {
    images: [],
    prepared: [],
    preparedUrls: new Map(),
    prepareImage(source) {
      this.prepared.push(source)
      const url = blobUrl(source)
      this.preparedUrls.set(source, url)
      for (const image of this.images) {
        if (image.dataset.mediaSrc === source) {
          image.attribute = url
          image.currentSrc = url
        }
      }
      return Promise.resolve()
    },
  }
  globalThis.__openingResourcesTest = scenario
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length }
  globalThis.document = {
    baseURI,
    fonts: Object.assign([], { ready: Promise.resolve() }),
    querySelectorAll(selector) {
      assert.equal(selector, '#root img[data-media-src]')
      return scenario.images
    },
  }
})
afterEach(() => {
  for (const [name, value] of Object.entries({
    document: previous.document,
    requestAnimationFrame: previous.raf,
    __openingResourcesTest: previous.scenario,
  })) {
    if (value === undefined) delete globalThis[name]
    else globalThis[name] = value
  }
})

async function prepareCritical() {
  const preparation = openingPreparation()
  await Promise.all(preparation.tasks.map(task => task.run()))
  return preparation
}
async function finalized(preparation) {
  const state = observe(preparation.finalize())
  await twoFrames()
  await flush()
  if (!state.settled && frames.length) await frame()
  await state.promise
  return state
}

test('only the six unique home resources are prepared, without waiting for distant clear images or effects', async () => {
  assert.equal(homeSources.length, 6)
  assert.equal(new Set(allSources).size, 42)
  scenario.images = allSources.map(source => new ImageNode(source))
  // The moving archive repeats its images; these copies must not add tasks.
  scenario.images.push(...Array.from({ length: 100 }, () => new ImageNode(farSource)))
  assert.equal(scenario.images.length, 142)
  const preparation = openingPreparation()
  assert.deepEqual(new Set(preparation.tasks.map(task => task.id)), new Set(homeSources.map(source => 'image:' + source)))
  assert.equal(preparation.tasks.length, 6)
  assert.doesNotMatch(source, /effectPreparationTasks|effectModules/)
  await Promise.all(preparation.tasks.map(task => task.run()))
  assert.deepEqual(new Set(scenario.prepared), new Set(homeSources))
  assert.ok(scenario.images.filter(image => !homeSources.includes(image.dataset.mediaSrc)).every(image => image.attribute === placeholderFor(image.dataset.mediaSrc)))
  const state = await finalized(preparation)
  assert.equal(state.error, null)
  assert.ok(scenario.images.every(image => image.decodes === 1))
})

test('all distant works must already show and decode their actual inline frame, even though their clear pack is not requested', async () => {
  scenario.images = [new ImageNode(cover), new ImageNode(farSource)]
  const preparation = await prepareCritical()
  assert.deepEqual(scenario.prepared, [cover])
  assert.match(scenario.images[1].attribute, /^data:image\/webp;base64,/)
  const bytes = Buffer.from(scenario.images[1].attribute.split(',')[1], 'base64')
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  const state = await finalized(preparation)
  assert.equal(state.error, null)
  assert.equal(scenario.images[1].decodes, 1)
  assert.equal(scenario.preparedUrls.has(farSource), false)
})

test('a valid inline thumbnail cannot satisfy home readiness before its clear resource is prepared', async () => {
  const critical = new ImageNode(cover)
  scenario.images = [critical, new ImageNode(farSource)]
  assert.match(critical.attribute, /^data:image\/webp;base64,/)
  const blocked = await finalized(openingPreparation())
  assert.match(blocked.error?.message || '', /opening image is not ready/)
  assert.equal(critical.decodes, 0)
  assert.equal(frames.length, 0)
  const preparation = await prepareCritical()
  const retried = await finalized(preparation)
  assert.equal(retried.error, null)
})

test('missing frame sources, missing DOM src, zero pixels and decode failure cannot count as display-ready', async () => {
  const failures = [
    new ImageNode('/images/missing-inline-frame.webp', { home: false }),
    new ImageNode(farSource, { attribute: null, current: null }),
    new ImageNode(farSource, { width: 0 }),
    new ImageNode(farSource, { complete: false }),
    new ImageNode(farSource, { decode: () => Promise.reject(new Error('corrupt inline frame')) }),
  ]
  for (const failedImage of failures) {
    scenario.images = [new ImageNode(cover), failedImage]
    const preparation = await prepareCritical()
    const state = await finalized(preparation)
    assert.match(state.error?.message || '', /not ready|placeholder|not decoded|corrupt inline frame/)
    assert.equal(frames.length, 0)
  }
})

test('home and inline-frame decoding must really finish before the final display paint', async () => {
  const first = deferred(), second = deferred()
  scenario.images = [
    new ImageNode(cover, { decode: () => first.promise }),
    new ImageNode(farSource, { decode: () => second.promise }),
  ]
  const preparation = await prepareCritical()
  const state = observe(preparation.finalize())
  await twoFrames()
  assert.ok(scenario.images.every(image => image.decodes === 1))
  assert.equal(state.settled, false)
  first.resolve()
  await flush()
  assert.equal(state.settled, false)
  second.resolve()
  await flush()
  assert.equal(state.settled, false)
  assert.equal(frames.length, 1)
  await frame()
  await state.promise
  assert.equal(state.error, null)
})

test('a prepared blob URL must match both the actual src and decoded currentSrc before entry', async () => {
  scenario.images = [new ImageNode(cover), new ImageNode(farSource)]
  const preparation = await prepareCritical()
  scenario.preparedUrls.set(farSource, blobUrl(farSource))
  const oldInline = scenario.images[1].attribute
  let state = await finalized(preparation)
  assert.match(state.error?.message || '', /placeholder/)
  scenario.images[1].attribute = blobUrl(farSource)
  scenario.images[1].currentSrc = oldInline
  state = await finalized(preparation)
  assert.match(state.error?.message || '', /not decoded/)
  scenario.images[1].currentSrc = blobUrl(farSource)
  state = await finalized(preparation)
  assert.equal(state.error, null)
})

test('font readiness must resolve, and font failures still block otherwise viewable content', async () => {
  scenario.images = [new ImageNode(cover), new ImageNode(farSource)]
  const preparation = await prepareCritical()
  const font = deferred()
  const fonts = [{ status: 'loading' }]
  fonts.ready = font.promise
  document.fonts = fonts
  const state = observe(preparation.finalize())
  await twoFrames()
  assert.equal(state.settled, false)
  assert.equal(frames.length, 0)
  fonts[0].status = 'loaded'
  font.resolve()
  await flush()
  assert.equal(state.settled, false)
  await frame()
  await state.promise
  assert.equal(state.error, null)

  document.fonts = Object.assign([{ status: 'error' }], { ready: Promise.resolve() })
  const failed = await finalized(preparation)
  assert.match(failed.error?.message || '', /font did not load/)
})

test('unmounted or unidentifiable home content cannot open merely because distant frame images exist', () => {
  scenario.images = []
  assert.throws(openingPreparation, /images are not mounted/)
  scenario.images = [new ImageNode(farSource)]
  assert.throws(openingPreparation, /images are not mounted/)
})
