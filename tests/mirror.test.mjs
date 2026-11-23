import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import * as defaultMedia from '../src/media.js'
import * as defaultPaths from '../src/assetPaths.js'
import { placeholderFor } from '../src/posterPlaceholders.js'

const base = '/yangzengyan-portfolio/'
const root = fileURLToPath(new URL('../', import.meta.url))
const directory = path.join(root, process.env.MIRROR_BUILD_DIR || 'dist-github')
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8')
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const mainSource = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8')
const films = [...new Set([...sourceHtml.matchAll(/href="\/media\/([^"?]+\.mp4)\?v=/g)].map(match => '/videos/' + match[1]))]
const importmap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1])
const [[entry, moduleUrl]] = Object.entries(importmap.imports)
const code = decodeURIComponent(moduleUrl.slice(moduleUrl.indexOf(',') + 1))
const diskPath = url => {
  const pathname = new URL(url, 'https://example.test').pathname
  assert.ok(pathname.startsWith(base), `asset escaped the project path: ${url}`)
  return path.join(directory, decodeURIComponent(pathname.slice(base.length)))
}
const nonemptyFile = file => fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0

// Execute the production helper source with build-time environment constants.
// The only substitution is import.meta.env; the URL/media implementation is not copied.
const moduleDataUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const pathsCode = fs.readFileSync(path.join(root, 'src/assetPaths.js'), 'utf8')
const mirrorPathsUrl = moduleDataUrl(pathsCode.replaceAll('import.meta.env', `(${JSON.stringify({ BASE_URL: base, VITE_STATIC_MIRROR: 'true' })})`))
const mirrorPaths = await import(mirrorPathsUrl)
const mediaCode = fs.readFileSync(path.join(root, 'src/media.js'), 'utf8').replace("'./assetPaths.js'", JSON.stringify(mirrorPathsUrl))
const mirrorMedia = await import(moduleDataUrl(mediaCode))

test('mirror keeps all 28 fallback films, the project restart link, and the full original shell', () => {
  assert.equal(films.length, 28)
  const links = [...html.matchAll(/href="([^"<>]+\.mp4\?v=20261112)"/g)].map(match => match[1])
  assert.deepEqual(new Set(links), new Set(films.map(film => base + film.slice(1) + '?v=20261112')))
  assert.equal(links.length, 28)
  assert.ok(html.includes(`href="${base}"`))
  assert.ok(html.includes('mailto:2206573527@qq.com'))
  assert.ok(!/href="\/(?:media\/|")/.test(html))
  for (const originalClass of ['reference-hero-copy', 'about-profile', 'mv-film-grid', 'culture-projects', 'fifi-gia', 'jiangxing-showcase', 'final-showcase']) {
    assert.ok(code.includes(originalClass), `original section missing: ${originalClass}`)
  }
})

test('mirror entry and style stay inline while the external entry identity exists for lazy chunks', () => {
  assert.equal(Object.keys(importmap.imports).length, 1)
  assert.ok(entry.startsWith(base + 'assets/'))
  assert.ok(moduleUrl.startsWith('data:text/javascript;charset=utf-8,'))
  assert.ok(nonemptyFile(diskPath(entry)), `missing external module identity: ${entry}`)
  assert.ok(html.includes(`import(${JSON.stringify(entry)})`))
  assert.ok(html.includes('<style data-app-styles>'))
  assert.ok(!/<script\b[^>]*\bsrc=/.test(html))
  assert.ok(!/<link\b[^>]*rel="stylesheet"/.test(html))
  const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: code, encoding: 'utf8' })
  assert.equal(checked.status, 0, checked.stderr)
})

test('all three inline lazy imports resolve inside the subpath to real JS assets', () => {
  const imports = [...code.matchAll(/import\(new URL\((['"])([^'"]+)\1,document\.baseURI\)\.href\)/g)].map(match => match[2])
  assert.equal(imports.length, 3)
  for (const href of imports) {
    assert.ok(href.startsWith(base + 'assets/'), href)
    assert.ok(nonemptyFile(diskPath(href)), `missing lazy asset: ${href}`)
    const chunk = fs.readFileSync(diskPath(href), 'utf8')
    assert.ok(chunk.includes(path.basename(entry)), `lazy chunk lost the original entry identity: ${href}`)
  }
  assert.ok(!/\bimport\s*\(\s*['"`]\.\//.test(code))
  assert.ok(!/new URL\(['"]\/assets\//.test(code))
  assert.ok(!/import\.meta\.(?:url|resolve)/.test(code))
})

test('every generated preload dependency points at a real emitted JS or CSS file', () => {
  const dependencies = [...code.matchAll(/['"`](assets\/[^'"`]+\.(?:js|css))['"`]/g)].map(match => match[1])
  assert.ok(dependencies.length >= 4)
  for (const dependency of dependencies) {
    assert.ok(nonemptyFile(path.join(directory, dependency)), `missing preload dependency: ${dependency}`)
  }
})

test('mirror image URLs use the project prefix and external/inline images stay unchanged', () => {
  assert.equal(mirrorPaths.siteBase, base)
  assert.equal(mirrorPaths.staticMirror, true)
  assert.equal(mirrorPaths.assetUrl('/images/profile/yang-zengyan.webp'), base + 'images/profile/yang-zengyan.webp')
  assert.equal(mirrorPaths.assetUrl('/mark.svg'), base + 'mark.svg')
  for (const href of ['https://example.test/photo.webp', '//example.test/photo.webp', 'data:image/webp;base64,AAAA', 'blob:example']) {
    assert.equal(mirrorPaths.assetUrl(href), href)
  }
  assert.equal(mirrorPaths.assetSrcSet('/one.webp 1x, /two.webp 2x'), `${base}one.webp 1x, ${base}two.webp 2x`)
})

test('mirror maps all films to local primary video paths and preserves both external fallbacks', () => {
  for (const film of films) {
    const candidates = mirrorMedia.playbackCandidates(film)
    assert.deepEqual(candidates, [
      base + film.slice(1) + '?v=20261112',
      `https://raw.githubusercontent.com/yangzengyan663/yangzengyan-portfolio/main/public${film}?v=20261112`,
      `https://yangzengyan-portfolio.pages.dev${film.replace('/videos/', '/media/')}?v=20261112`,
    ])
    const poster = mirrorMedia.previewPoster(film)
    assert.ok(poster, `missing first frame: ${film}`)
    assert.ok(placeholderFor(poster)?.startsWith('data:image/webp;base64,'), `missing inline first frame: ${film}`)
  }
  const external = 'https://example.test/film.mp4'
  assert.deepEqual(mirrorMedia.playbackCandidates(external), [external])
})

test('the default Cloudflare build keeps root paths and its original two source routes', () => {
  assert.equal(defaultPaths.siteBase, '/')
  assert.equal(defaultPaths.staticMirror, false)
  assert.equal(defaultPaths.assetUrl('/images/example.webp'), '/images/example.webp')
  for (const film of films) {
    assert.deepEqual(defaultMedia.playbackCandidates(film), [
      film.replace('/videos/', '/media/') + '?v=20261112',
      `https://raw.githubusercontent.com/yangzengyan663/yangzengyan-portfolio/main/public${film}?v=20261112`,
    ])
  }
})

test('the final mirror package contains every primary film, visible image, poster and SVG', () => {
  const required = new Set(['/mark.svg'])
  for (const film of films) { required.add(film); required.add(mirrorMedia.previewPoster(film)) }
  for (const match of mainSource.matchAll(/['"`](\/(?:images|media-previews)\/[^'"`$]+)['"`]/g)) {
    required.add(defaultMedia.thumbnailUrl(match[1]))
  }
  const missing = [...required].filter(href => !nonemptyFile(diskPath(mirrorPaths.assetUrl(href))))
  assert.deepEqual(missing, [], 'Merge original images/SVG/films before publishing this mirror')
})
