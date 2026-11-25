import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { thumbnailUrl } from '../src/media.js'

const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const source = await fs.readFile(new URL('../src/imagePreview.js', import.meta.url), 'utf8')
const mockImages = moduleUrl(`
  export const prepareImage = source => globalThis.__previewTest.prepare(source);
  export const preparedImageSource = source => globalThis.__previewTest.images.get(source);
`)
const { loadPreviewOriginal } = await import(moduleUrl(source.replace("'./preparedImages.js'", JSON.stringify(mockImages))))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = async () => { for (let step = 0; step < 6; step++) await Promise.resolve() }
function scenario(t, prepare) {
  const prior = globalThis.__previewTest
  const images = new Map(), calls = []
  globalThis.__previewTest = { images, prepare: source => { calls.push(source); return prepare(source) } }
  t.after(() => { if (prior === undefined) delete globalThis.__previewTest; else globalThis.__previewTest = prior })
  return { images, calls }
}

test('a cached and decoded original is immediately ready without another request', t => {
  const { images, calls } = scenario(t, () => assert.fail('cached originals should not download again'))
  images.set('/original.png', '/site/original.png')
  const states = []
  loadPreviewOriginal('/original.png', state => states.push(state))
  assert.deepEqual(states, [{ source: '/original.png', status: 'ready', url: '/site/original.png' }])
  assert.equal(calls.length, 0)
})

test('the original becomes displayable only after the shared image preparation has actually decoded it', async t => {
  const gate = deferred()
  const { images, calls } = scenario(t, () => gate.promise)
  const states = []
  loadPreviewOriginal('/original.png', state => states.push(state))
  await flush()
  assert.deepEqual(states, [{ source: '/original.png', status: 'loading' }])
  assert.deepEqual(calls, ['/original.png'])
  images.set('/original.png', '/site/original.png')
  gate.resolve()
  await flush()
  assert.deepEqual(states.at(-1), { source: '/original.png', status: 'ready', url: '/site/original.png' })
})

test('an unavailable original reports a retryable error without replacing the visible preview', async t => {
  const gate = deferred()
  scenario(t, () => gate.promise)
  const states = []
  loadPreviewOriginal('/original.png', state => states.push(state))
  gate.reject(new Error('network unavailable'))
  await flush()
  assert.deepEqual(states.at(-1), { source: '/original.png', status: 'error' })
  assert.ok(states.every(state => !state.url), 'A failed original must never become the visible image source')
})

test('a closed or replaced preview ignores late success and error notifications', async t => {
  const first = deferred(), second = deferred()
  const { images } = scenario(t, source => source === '/first.png' ? first.promise : second.promise)
  const states = []
  const closeFirst = loadPreviewOriginal('/first.png', state => states.push(state))
  closeFirst()
  const closeSecond = loadPreviewOriginal('/second.png', state => states.push(state))
  closeSecond()
  images.set('/first.png', '/site/first.png')
  first.resolve()
  second.reject(new Error('late error'))
  await flush()
  assert.deepEqual(states, [{ source: '/first.png', status: 'loading' }, { source: '/second.png', status: 'loading' }])
})

test('retry loads the failed original again and can promote the preview after successful decoding', async t => {
  const attempts = [deferred(), deferred()]
  const { images, calls } = scenario(t, () => attempts[calls.length - 1].promise)
  const states = []
  const close = loadPreviewOriginal('/original.png', state => states.push(state))
  attempts[0].reject(new Error('first request failed'))
  await flush()
  close()
  loadPreviewOriginal('/original.png', state => states.push(state))
  images.set('/original.png', '/site/original.png')
  attempts[1].resolve()
  await flush()
  assert.equal(calls.length, 2)
  assert.deepEqual(states.map(state => state.status), ['loading', 'error', 'loading', 'ready'])
})

test('a resolved preparation without a decoded registry URL cannot report original quality', async t => {
  scenario(t, () => Promise.resolve())
  const states = []
  loadPreviewOriginal('/original.png', state => states.push(state))
  await flush()
  assert.deepEqual(states.at(-1), { source: '/original.png', status: 'error' })
})

const require = createRequire(new URL('../package.json', import.meta.url))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { transformWithOxc } = await import(pathToFileURL(require.resolve('vite')).href)
const imports = {
  react: pathToFileURL(require.resolve('react')).href,
  'react/jsx-runtime': pathToFileURL(require.resolve('react/jsx-runtime')).href,
  'react-dom': moduleUrl('export const createPortal = child => child'),
  './preparedImages': mockImages,
  './imagePreview': moduleUrl('export const loadPreviewOriginal = () => { throw new Error("SSR must not request originals") }'),
  './assetPaths': moduleUrl("export const assetUrl = source => '/portfolio' + source"),
  './media': moduleUrl(`export const thumbnailUrl = source => globalThis.__previewTest.thumbnail(source); export const isPlayerOpen = () => false; export const setPlayerOpen = () => {};`),
}
let { code } = await transformWithOxc(await fs.readFile(new URL('../src/ImagePreviewModal.jsx', import.meta.url), 'utf8'), 'ImagePreviewModal.jsx', { jsx: { runtime: 'automatic' } })
for (const [name, url] of Object.entries(imports)) code = code.replaceAll(`from '${name}'`, `from '${url}'`).replaceAll(`from "${name}"`, `from "${url}"`)
const { default: ImagePreviewModal } = await import(moduleUrl(code))
const originals = [
  '/images/chinese-culture/jinshan-promo-01.jpg', '/images/chinese-culture/jinshan-promo-02.jpg',
  '/images/chinese-culture/ancient-shu-01.png', '/images/chinese-culture/ancient-shu-02.png',
  '/images/advertising-series/seagames-01.png', '/images/advertising-series/seagames-02.png',
  '/images/jiangxing-laptop/jiangxing-laptop-poster.png',
]

test('all seven image entry points immediately render their already loaded clear cover while the original is pending', t => {
  const { images } = scenario(t, () => assert.fail('rendering a modal should not independently fetch an original'))
  const previousDocument = globalThis.document
  globalThis.document = { body: {} }
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument })
  globalThis.__previewTest.thumbnail = thumbnailUrl
  for (const original of originals) {
    const thumbnail = thumbnailUrl(original)
    assert.notEqual(thumbnail, original)
    images.set(thumbnail, 'blob:clear-preview/' + images.size)
    const html = renderToStaticMarkup(React.createElement(ImagePreviewModal, { project: { image: original, label: original }, onClose() {} }))
    const image = html.match(/<img\b[^>]*>/)?.[0]
    assert.ok(image?.includes(`src="${images.get(thumbnail)}"`), original)
    assert.match(image, /data-image-quality="preview"/)
    assert.match(html, /正在加载原图/)
    assert.ok(html.includes(`href="/portfolio${original}"`))
  }
})
