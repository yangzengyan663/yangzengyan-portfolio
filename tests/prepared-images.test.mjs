import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'

const source = await fs.readFile(new URL('../src/preparedImages.js', import.meta.url), 'utf8')
const paths = await fs.readFile(new URL('../src/assetPaths.js', import.meta.url), 'utf8')
const moduleUrl = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64')
const react = moduleUrl(`
  export const useCallback = callback => callback;
  export const useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => {
    globalThis.__preparedImageTestCapture = { subscribe, getSnapshot, getServerSnapshot };
    return getSnapshot();
  };
`)
const pathsUrl = moduleUrl(paths.replaceAll('import.meta.env', `({ BASE_URL: '/image-test/', VITE_STATIC_MIRROR: 'true' })`))
let instance = 0
const deferred = () => {
  let resolve, reject
  const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse })
  return { promise, resolve, reject }
}

async function fixture(t) {
  const priorImage = globalThis.Image
  const priorCapture = globalThis.__preparedImageTestCapture
  const created = []
  class Image {
    naturalWidth = 0
    complete = false
    decodeCalls = 0
    decodingResult = deferred()
    constructor() { created.push(this) }
    decode() { this.decodeCalls += 1; return this.decodingResult.promise }
    loaded(width = 24) { this.complete = true; this.naturalWidth = width; this.onload?.() }
    failed() { this.onerror?.() }
  }
  globalThis.Image = Image
  t.after(() => {
    if (priorImage === undefined) delete globalThis.Image
    else globalThis.Image = priorImage
    if (priorCapture === undefined) delete globalThis.__preparedImageTestCapture
    else globalThis.__preparedImageTestCapture = priorCapture
  })
  const code = source.replace("from 'react'", `from '${react}'`)
    .replace("'./assetPaths.js'", JSON.stringify(pathsUrl)) + '\n// isolated test registry ' + ++instance
  const api = await import(moduleUrl(code))
  const store = image => {
    const ready = api.usePreparedImage(image)
    return { ready, ...globalThis.__preparedImageTestCapture }
  }
  return { api, created, store }
}

test('concurrent preparation deduplicates a source and readiness waits for actual decoding', async t => {
  const { api, created, store } = await fixture(t)
  const first = api.prepareImage('/images/cover.webp')
  const second = api.prepareImage('/images/cover.webp')
  assert.equal(first, second)
  assert.equal(created.length, 1)
  const image = created[0]
  assert.equal(image.src, '/image-test/images/cover.webp')
  assert.equal(image.loading, 'eager')
  assert.equal(store('/images/cover.webp').ready, false)
  image.loaded()
  image.loaded() // A cached load notification must not decode or count twice.
  assert.equal(image.decodeCalls, 1)
  assert.equal(store('/images/cover.webp').ready, false)
  image.decodingResult.resolve()
  assert.equal(await first, image)
  assert.equal(store('/images/cover.webp').ready, true)
  assert.equal(api.prepareImage('/images/cover.webp'), first)
  assert.equal(created.length, 1)
})

test('a decode failure is not prepared and the same source can genuinely retry', async t => {
  const { api, created, store } = await fixture(t)
  const first = api.prepareImage('/images/retry.jpg')
  const rejected = assert.rejects(first, /decode failed/)
  created[0].loaded()
  created[0].decodingResult.reject(new Error('decode failed'))
  await rejected
  assert.equal(store('/images/retry.jpg').ready, false)
  const retry = api.prepareImage('/images/retry.jpg')
  assert.notEqual(retry, first)
  assert.equal(created.length, 2)
  created[1].loaded()
  created[1].decodingResult.resolve()
  await retry
  assert.equal(store('/images/retry.jpg').ready, true)
})

test('a load event with zero pixels never becomes prepared', async t => {
  const { api, created, store } = await fixture(t)
  const loading = api.prepareImage('/images/empty.png')
  const rejected = assert.rejects(loading, /no decoded pixels/)
  created[0].loaded(0)
  await rejected
  assert.equal(created[0].decodeCalls, 0)
  assert.equal(store('/images/empty.png').ready, false)
})

test('a network failure does not notify readiness and leaves the URL retryable', async t => {
  const { api, created, store } = await fixture(t)
  const cover = store('/images/network.webp')
  let notified = 0
  const unsubscribe = cover.subscribe(() => notified++)
  const loading = api.prepareImage('/images/network.webp')
  const rejected = assert.rejects(loading, /could not be loaded/)
  created[0].failed()
  await rejected
  assert.equal(notified, 0)
  assert.equal(cover.getSnapshot(), false)
  const retry = api.prepareImage('/images/network.webp')
  created[1].loaded()
  created[1].decodingResult.resolve()
  await retry
  assert.equal(notified, 1)
  assert.equal(cover.getSnapshot(), true)
  unsubscribe()
})

test('ready notifications are source-specific, unsubscribeable, and readable after preparation', async t => {
  const { api, created, store } = await fixture(t)
  const first = store('/images/first.webp')
  const second = store('/images/second.webp')
  const snapshots = []
  const unsubscribeFirst = first.subscribe(() => snapshots.push(['first', first.getSnapshot()]))
  const unsubscribeSecond = second.subscribe(() => snapshots.push(['second', second.getSnapshot()]))
  const firstPromise = api.prepareImage('/images/first.webp')
  const secondPromise = api.prepareImage('/images/second.webp')
  created[0].loaded()
  created[0].decodingResult.resolve()
  await firstPromise
  assert.deepEqual(snapshots, [['first', true]])
  assert.equal(second.getSnapshot(), false)
  assert.equal(first.getServerSnapshot(), false)
  unsubscribeFirst()
  unsubscribeSecond()
  created[1].loaded()
  created[1].decodingResult.resolve()
  await secondPromise
  assert.deepEqual(snapshots, [['first', true]])
  assert.equal(store('/images/second.webp').ready, true)
})

test('video URLs and inline placeholders cannot start opening-time media requests', async t => {
  const { api, created } = await fixture(t)
  for (const input of ['/videos/film.mp4', '/videos/film.mp4?v=1', '/preview.webm', 'data:image/webp;base64,AAAA', undefined]) {
    await assert.rejects(api.prepareImage(input), /Only a static image/)
  }
  assert.equal(created.length, 0)
})
