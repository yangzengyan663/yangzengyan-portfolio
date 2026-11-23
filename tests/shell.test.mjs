import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1])
const [entry, moduleUrl] = Object.entries(map.imports)[0]
const code = decodeURIComponent(moduleUrl.slice(moduleUrl.indexOf(',') + 1))
const films = JSON.parse(fs.readFileSync(new URL('../scripts/portfolio-films.json', import.meta.url), 'utf8'))
const initialMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')

test('first render has no external entry script or main stylesheet dependency', () => {
  assert(!/<script\b[^>]*\bsrc=/.test(html))
  assert(!/<link\b[^>]*rel="stylesheet"/.test(html))
  assert(html.includes('<style data-app-styles>'))
  const loaderPosition = html.indexOf('id="opening-loader"')
  assert(loaderPosition >= 0, 'The original opening counter must be present in the initial HTML')
  assert(loaderPosition < html.indexOf('<style data-app-styles>'))
})
test('the opening counter replaces the lightweight initial film list', () => {
  assert.match(initialMarkup, /<div\b[^>]*id="root"[^>]*>\s*<\/div>/)
  assert.match(initialMarkup, /id="opening-loader"/)
  assert.match(initialMarkup.slice(initialMarkup.indexOf('id="opening-loader"')), />\s*0(?:\s*%|\s*<)/)
  assert.doesNotMatch(initialMarkup, /<[^>]+class=["'][^"']*portfolio-recovery/)
  assert.doesNotMatch(initialMarkup, /href=["'][^"']*\.mp4(?:\?|["'])/)
})

test('the independent manifest retains all 28 films in the compiled original application', () => {
  assert.equal(films.length, 28)
  assert.equal(new Set(films).size, 28)
  for (const film of films) assert.ok(code.includes(film), 'Film missing from the original application: ' + film)
})

test('embedded module parses and lazy imports use an HTTP document base', () => {
  const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: code, encoding: 'utf8' })
  assert.equal(checked.status, 0, checked.stderr)
  assert(!/\bimport\s*\(\s*["'`]\.\//.test(code))
  assert(code.includes('document.baseURI'))
  assert(code.includes('import(new URL('))
})
test('older module browsers retain the external entry, and lazy chunks share its identity', () => {
  assert(html.includes(`import(${JSON.stringify(entry)})`))
  const original = new URL('../dist' + entry, import.meta.url)
  assert(fs.existsSync(original))
  const assets = new URL('../dist/assets/', import.meta.url)
  const lazy = fs.readdirSync(assets).filter(name => /^(ProfileTextEffects|WebThreads)-.*\.js$/.test(name))
  assert(lazy.length >= 2)
  for (const name of lazy) assert(fs.readFileSync(new URL(name, assets), 'utf8').includes(path.basename(entry)))
})
