import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { observeNearViewport } from '../src/useNearViewport.js'
import { previewPoster } from '../src/media.js'
import { placeholderFor } from '../src/posterPlaceholders.js'

const require = createRequire(new URL('../package.json', import.meta.url))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { transformWithOxc } = await import(pathToFileURL(require.resolve('vite')).href)
const reactUrl = pathToFileURL(require.resolve('react')).href
const jsxUrl = pathToFileURL(require.resolve('react/jsx-runtime')).href
const compile = async (filename, imports) => {
  const file = new URL(`../src/${filename}`, import.meta.url)
  let { code } = await transformWithOxc(await readFile(file, 'utf8'), filename, { jsx: { runtime: 'automatic' } })
  for (const [name, destination] of Object.entries({ react: reactUrl, 'react/jsx-runtime': jsxUrl, ...imports })) {
    code = code.replaceAll(`from '${name}'`, `from '${destination}'`).replaceAll(`from "${name}"`, `from "${destination}"`)
  }
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}
const lazyUrl = await compile('LazyImage.jsx', { './assetPaths': new URL('../src/assetPaths.js', import.meta.url).href, './useNearViewport': new URL('../src/useNearViewport.js', import.meta.url).href, './posterPlaceholders': new URL('../src/posterPlaceholders.js', import.meta.url).href })
const { default: LazyImage } = await import(lazyUrl)
const { default: PreviewVideo } = await import(await compile('PreviewVideo.jsx', {
  './LazyImage': lazyUrl, './media': new URL('../src/media.js', import.meta.url).href,
}))

const priorWindow = globalThis.window
let cleanups
class Observer {
  static instances = []
  targets = new Set()
  constructor(callback, options) { this.callback = callback; this.options = options; Observer.instances.push(this) }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.targets.clear() }
  enter(target) { this.callback([{ target, isIntersecting: true }]) }
}
const section = () => ({})
const image = parent => ({ closest: () => parent })
const observerFor = target => Observer.instances.find(observer => observer.targets.has(target))
const watch = (...args) => { const close = observeNearViewport(...args); cleanups.push(close); return close }
const imgTag = markup => markup.match(/<img\b[^>]*>/)?.[0]

test('every film in the original portfolio has a real inline first-frame placeholder', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const films = [...html.matchAll(/href="(\/media\/[^"?]+)/g)].map(match => match[1].replace('/media/', '/videos/'))
  assert.equal(new Set(films).size, 28)
  for (const film of films) {
    const poster = previewPoster(film)
    assert.ok(poster, film)
    const placeholder = placeholderFor(poster)
    assert.match(placeholder || '', /^data:image\/webp;base64,/, poster)
    const bytes = Buffer.from(placeholder.split(',')[1], 'base64')
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  }
})

beforeEach(() => {
  Observer.instances = []
  cleanups = []
  globalThis.window = { IntersectionObserver: Observer }
})
afterEach(() => {
  cleanups.forEach(close => close())
  if (priorWindow) globalThis.window = priorWindow
  else delete globalThis.window
})

test('far sections do not observe or reveal their individual covers', () => {
  const group = section()
  const cover = image(group)
  let revealed = 0
  watch(cover, () => revealed++)
  assert.ok(observerFor(group))
  assert.equal(observerFor(cover), undefined)
  assert.equal(revealed, 0)
})

test('both the section and image must approach before a cover is released, then it stays released', () => {
  const group = section()
  const cover = image(group)
  let revealed = 0
  const close = watch(cover, () => revealed++)
  observerFor(group).enter(group)
  assert.equal(revealed, 0)
  const observer = observerFor(cover)
  assert.equal(observer.options.rootMargin, '800px 0px')
  observer.enter(cover)
  assert.equal(revealed, 1)
  observer.enter(cover)
  close()
  close()
  assert.equal(revealed, 1)
  assert.ok(Observer.instances.every(instance => instance.targets.size === 0))
})

test('covers share observers while retaining independent image gates', () => {
  const group = section()
  const first = image(group)
  const second = image(group)
  const reveals = []
  watch(first, () => reveals.push('first'))
  watch(second, () => reveals.push('second'))
  assert.equal(Observer.instances.length, 1)
  observerFor(group).enter(group)
  observerFor(first).enter(first)
  assert.deepEqual(reveals, ['first'])
  assert.ok(observerFor(second))
  observerFor(second).enter(second)
  assert.deepEqual(reveals, ['first', 'second'])
})

test('unmounting a far cover removes all observations and ignores stale callbacks', () => {
  const group = section()
  const cover = image(group)
  let revealed = 0
  const close = watch(cover, () => revealed++)
  const observer = observerFor(group)
  close()
  observer.enter(group)
  assert.equal(revealed, 0)
  assert.equal(observerFor(cover), undefined)
})

test('custom section and image distances are preserved', () => {
  const group = section()
  const cover = image(group)
  watch(cover, () => {}, { rootMargin: '700px 0px', sectionRootMargin: '900px 0px' })
  assert.equal(observerFor(group).options.rootMargin, '900px 0px')
  observerFor(group).enter(group)
  assert.equal(observerFor(cover).options.rootMargin, '700px 0px')
})

test('an image outside a section is gated by its own visibility', () => {
  const cover = image(null)
  let revealed = 0
  watch(cover, () => revealed++)
  assert.equal(revealed, 0)
  observerFor(cover).enter(cover)
  assert.equal(revealed, 1)
})

test('browsers without IntersectionObserver still reveal a cover without videos', () => {
  globalThis.window = {}
  let revealed = 0
  const close = watch(image(section()), () => revealed++)
  close()
  assert.equal(revealed, 1)
})

test('a lazy image first renders only an inline placeholder and no responsive network source', () => {
  const placeholder = 'data:image/webp;base64,AAAA'
  const tag = imgTag(renderToStaticMarkup(React.createElement(LazyImage, {
    src: '/poster.webp', srcSet: '/large.webp 2x', placeholder, alt: '作品首帧', className: 'original-card', style: { objectFit: 'contain' },
  })))
  assert.match(tag, /\ssrc="data:image\/webp;base64,AAAA"/)
  assert.doesNotMatch(tag, /\ssrcSet=/i)
  assert.match(tag, /data-media-src="\/poster.webp"/)
  assert.match(tag, /data-media-loaded="false"/)
  assert.match(tag, /class="original-card"/)
  assert.match(tag, /object-fit:contain/)
  assert.match(tag, /background-image:url/)
})

test('a lazy image without a placeholder has no empty or remote src', () => {
  const tag = imgTag(renderToStaticMarkup(React.createElement(LazyImage, { src: '/poster.webp' })))
  assert.doesNotMatch(tag, /\ssrc=/)
})

test('eager images immediately expose their full source and retain the inline background', () => {
  const tag = imgTag(renderToStaticMarkup(React.createElement(LazyImage, {
    src: '/hero.webp', srcSet: '/hero-large.webp 2x', loading: 'eager', placeholder: 'data:image/webp;base64,AAAA',
  })))
  assert.match(tag, /\ssrc="\/hero.webp"/)
  assert.match(tag, /\ssrcSet="\/hero-large.webp 2x"/i)
  assert.match(tag, /background-image:url/)
})

test('PreviewVideo always renders an image, even when active or given video autoplay props', () => {
  const markup = renderToStaticMarkup(React.createElement(PreviewVideo, {
    src: '/videos/cup-people/1.mp4', active: true, autoPlay: true, muted: true, loop: true, preload: 'auto',
  }))
  assert.ok(imgTag(markup))
  assert.doesNotMatch(markup, /<video|\sautoPlay=|\spreload=|\sloop=/i)
  assert.match(markup, /data-media-src="\/media-previews\/cup-1.jpg"/)
  assert.match(markup, /alt="视频首帧"/)
  assert.match(markup, /class="preview-video-poster"/)
})

test('known films show a tiny real frame before the full image is near', () => {
  const markup = renderToStaticMarkup(React.createElement(PreviewVideo, { src: '/videos/chinese-culture/jinshan.mp4' }))
  const image = imgTag(markup)
  assert.match(image, /src="data:image\/webp;base64,/)
  assert.match(image, /data-media-src="\/media-previews\/jinshan.jpg"/)
  assert.doesNotMatch(markup, /<video/)
})
