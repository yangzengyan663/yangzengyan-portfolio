import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import fs from 'node:fs'
import packs from '../src/displayPackManifest.js'
import { placeholderFor } from '../src/posterPlaceholders.js'

const source = fs.readFileSync(new URL('../src/openingResources.js', import.meta.url), 'utf8')
const asModule = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const dependencies = {
  './displayPackManifest.js': new URL('../src/displayPackManifest.js', import.meta.url).href,
  './assetPaths': new URL('../src/assetPaths.js', import.meta.url).href,
  './preparedImages': asModule(
    'export const prepareImage = source => globalThis.__openingResourcesTest.prepareImage(source);' +
    'export const preparedImageSource = source => globalThis.__openingResourcesTest.preparedUrls.get(source);'
  ),
  './effectModules': asModule('export const effectPreparationTasks = () => [{ id: "effects", run: async () => { globalThis.__openingResourcesTest.effectsLoaded++ } }];'),
  './backgroundReadiness': asModule('export const waitForBackgrounds = () => globalThis.__openingResourcesTest.background;'),
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
    effectsLoaded: 0,
    background: Promise.resolve(),
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

test('all 42 clear covers and the original effect code are prepared before entry', async () => {
  scenario.images = allSources.map(source => new ImageNode(source));
  scenario.images.push(...Array.from({length:100},()=>new ImageNode(farSource)));
  const preparation = await prepareCritical();
  assert.equal(preparation.tasks.length,43);
  assert.equal(new Set(scenario.prepared).size,42);
  assert.equal(scenario.effectsLoaded,1);
  const state = await finalized(preparation);
  assert.equal(state.error,null);
  assert.equal(scenario.images.length,142);
  assert.ok(scenario.images.every(image=>image.decodes===1 && image.currentSrc.startsWith('blob:')));
});

test('even a valid distant inline frame cannot replace its clear image at 100 percent', async () => {
  scenario.images=[new ImageNode(cover),new ImageNode(farSource)];
  const preparation=await prepareCritical();
  scenario.preparedUrls.delete(farSource);
  scenario.images[1].attribute=placeholderFor(farSource);
  scenario.images[1].currentSrc=placeholderFor(farSource);
  const state=await finalized(preparation);
  assert.match(state.error?.message||'',/not ready/);
});

test('all decoded images still wait until the backgrounds have actually drawn', async () => {
  const background=deferred();scenario.background=background.promise;
  scenario.images=[new ImageNode(cover),new ImageNode(farSource)];
  const preparation=await prepareCritical();
  const state=observe(preparation.finalize());
  await twoFrames();assert.equal(state.settled,false);assert.equal(frames.length,0);
  background.resolve();await flush();assert.equal(state.settled,false);
  await frame();await state.promise;assert.equal(state.error,null);
});

test('a clear registry URL must match the rendered src and decoded currentSrc', async () => {
  scenario.images=[new ImageNode(cover),new ImageNode(farSource)];
  const preparation=await prepareCritical();
  scenario.images[1].attribute=placeholderFor(farSource);
  let state=await finalized(preparation);assert.match(state.error?.message||'',/placeholder/);
  scenario.images[1].attribute=blobUrl(farSource);scenario.images[1].currentSrc=placeholderFor(farSource);
  state=await finalized(preparation);assert.match(state.error?.message||'',/not decoded/);
  scenario.images[1].currentSrc=blobUrl(farSource);
  state=await finalized(preparation);assert.equal(state.error,null);
});

test('bad pixels or a rejected decode cannot count as clear content', async () => {
  for(const options of [{width:0},{complete:false},{decode:()=>Promise.reject(new Error('bad decode'))}]) {
    scenario.images=[new ImageNode(cover),new ImageNode(farSource,options)];
    const state=await finalized(await prepareCritical());
    assert.match(state.error?.message||'',/not decoded|bad decode/);
  }
});

test('font errors still prevent a premature completed opening', async () => {
  scenario.images=[new ImageNode(cover)];
  const preparation=await prepareCritical();
  document.fonts=Object.assign([{status:'error'}],{ready:Promise.resolve()});
  const state=await finalized(preparation);assert.match(state.error?.message||'',/font did not load/);
});

test('empty page content cannot report a completed opening',()=>{
  scenario.images=[];assert.throws(openingPreparation,/not mounted/);
});
