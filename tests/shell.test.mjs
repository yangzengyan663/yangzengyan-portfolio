import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1])
const [entry, moduleUrl] = Object.entries(map.imports)[0]
const code = decodeURIComponent(moduleUrl.slice(moduleUrl.indexOf(',') + 1))

test('first render has no external entry script or main stylesheet dependency', () => {
  assert(!/<script\b[^>]*\bsrc=/.test(html))
  assert(!/<link\b[^>]*rel="stylesheet"/.test(html))
  assert(html.includes('<style data-app-styles>'))
  assert(html.indexOf('class="portfolio-recovery"') < html.indexOf('<style data-app-styles>'))
})
test('all 28 unique films and contact links survive an unavailable module runtime', () => {
  const links = [...html.matchAll(/href="(\/media\/[^\"]+)"/g)].map(match => match[1])
  assert.equal(new Set(links).size, 28)
  assert.equal(links.length, 28)
  assert(html.includes('mailto:2206573527@qq.com'))
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
