import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const bootstrap = html.match(/<script\b[^>]*data-opening-bootstrap[^>]*>([\s\S]*?)<\/script>/)?.[1]
assert.ok(bootstrap, 'the initial HTML must contain its opening bootstrap')

class Element extends EventTarget {
  constructor({ text = '', hidden = false, attributes = {}, classes = [] } = {}) {
    super()
    this.textContent = text
    this.hidden = hidden
    this.attributes = new Map(Object.entries(attributes))
    this.classes = new Set(classes)
    this.removals = 0
    this.children = []
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
    }
    const properties = new Map()
    this.style = { setProperty: (key, value) => properties.set(key, value), getPropertyValue: key => properties.get(key) }
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  removeAttribute(name) { this.attributes.delete(name) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  hasAttribute(name) { return this.attributes.has(name) }
  remove() { this.removals += 1 }
}

function opening() {
  let now = 0
  let nextId = 0
  let reloads = 0
  const tasks = new Map()
  const nodes = {
    'opening-loader': new Element({ attributes: { role: 'status' }, classes: ['hero-loader'] }),
    'opening-count': new Element({ text: '0%' }),
    'opening-rule': new Element(),
    root: new Element({ attributes: { inert: '', 'aria-hidden': 'true' } }),
    'opening-message': new Element({ hidden: true }),
    'opening-retry': new Element({ hidden: true }),
  }
  const events = []
  const document = new EventTarget()
  document.documentElement = new Element()
  document.getElementById = id => { assert.ok(nodes[id], `unexpected DOM target: ${id}`); return nodes[id] }
  document.createElement = tag => assert.fail(`opening bootstrap must not create ${tag} resources`)
  document.addEventListener('portfolio-opening-finished', event => events.push({ type: event.type, at: now }))
  const schedule = (callback, delay, isFrame = false) => {
    const id = ++nextId
    tasks.set(id, { at: now + delay, callback, isFrame })
    return id
  }
  const window = {}
  const context = vm.createContext({
    window, document, Event, Promise,
    performance: { now: () => now },
    requestAnimationFrame: callback => schedule(callback, 16, true),
    cancelAnimationFrame: id => tasks.delete(id),
    setTimeout: (callback, delay = 0) => schedule(callback, delay),
    clearTimeout: id => tasks.delete(id),
    location: { reload: () => reloads++ },
    fetch: () => assert.fail('opening bootstrap must not download videos or other resources'),
    XMLHttpRequest: class { constructor() { assert.fail('opening bootstrap must not issue network requests') } },
    Image: class { constructor() { assert.fail('opening must decode the mounted images, not request replacements') } },
  })
  vm.runInContext(bootstrap, context, { timeout: 1000, filename: 'index.html:opening-bootstrap' })
  const flush = async () => { for (let step = 0; step < 8; step++) await Promise.resolve() }
  const advanceTo = async target => {
    assert.ok(target >= now, 'fake time must move forward')
    await flush()
    while (true) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!next) break
      const [id, task] = next
      tasks.delete(id)
      now = task.at
      task.callback(...(task.isFrame ? [now] : []))
      await flush()
    }
    now = target
    await flush()
  }
  return {
    api: window.__portfolioOpening, nodes, document, events, tasks, advanceTo, flush,
    get now() { return now }, get reloads() { return reloads },
  }
}

const hidden = runner => runner.nodes['opening-loader'].classList.contains('is-hidden')
const pendingImage = () => {
  let resolve
  let calls = 0
  const promise = new Promise(done => { resolve = done })
  return { decode: () => { calls++; return promise }, resolve, get calls() { return calls } }
}

test('the first HTML displays the numeric opening before module execution and has no lightweight work list', () => {
  assert.match(html, /id="opening-count"[^>]*>0%<\/span>/)
  assert.ok(html.indexOf('id="opening-loader"') < html.indexOf('id="root"'))
  assert.ok(html.indexOf('data-opening-bootstrap') < html.indexOf('type="module"'))
  assert.ok(!html.includes('portfolio-recovery'))
  assert.ok(!/<nav\b/.test(html))
  const runner = opening()
  assert.equal(runner.nodes['opening-count'].textContent, '0%')
  assert.equal(runner.document.documentElement.classList.contains('portfolio-loading'), true)
  assert.equal(typeof runner.api.ready, 'function')
  assert.equal(hidden(runner), false)
})

test('the counter advances immediately but never reveals the page before the app mounts', async () => {
  const runner = opening()
  await runner.advanceTo(160)
  assert.ok(Number.parseInt(runner.nodes['opening-count'].textContent) > 0)
  await runner.advanceTo(24000)
  assert.equal(runner.nodes['opening-count'].textContent, '95%')
  assert.equal(runner.api.isFinished(), false)
  assert.equal(hidden(runner), false)
  assert.equal(runner.nodes.root.hasAttribute('inert'), true)
  assert.equal(runner.events.length, 0)
})

test('mounted content and decoding run behind the opening while the minimum duration is respected', async () => {
  const runner = opening()
  const first = pendingImage()
  const second = pendingImage()
  const mountedContent = { id: 'home', images: [first, second] }
  runner.nodes.root.children.push(mountedContent)
  runner.api.ready([first, second])
  assert.equal(first.calls, 1)
  assert.equal(second.calls, 1)
  assert.deepEqual(runner.nodes.root.children, [mountedContent])
  first.resolve()
  second.resolve()
  await runner.advanceTo(2199)
  assert.equal(hidden(runner), false)
  assert.equal(runner.events.length, 0)
  await runner.advanceTo(2320)
  assert.equal(runner.nodes['opening-count'].textContent, '100%')
  assert.equal(runner.api.isFinished(), true)
  assert.equal(hidden(runner), true)
  assert.equal(runner.nodes.root.hasAttribute('inert'), false)
  assert.equal(runner.nodes.root.hasAttribute('aria-hidden'), false)
  assert.equal(runner.document.documentElement.classList.contains('portfolio-loading'), false)
  assert.ok(runner.events[0].at >= 2200 + 80)
  assert.deepEqual(runner.nodes.root.children, [mountedContent])
})

test('late mounting waits for real first-screen decoding rather than hiding at the minimum duration', async () => {
  const runner = opening()
  const image = pendingImage()
  await runner.advanceTo(1800)
  runner.api.ready([image])
  await runner.advanceTo(2400)
  assert.equal(runner.nodes['opening-count'].textContent, '95%')
  assert.equal(hidden(runner), false)
  image.resolve()
  await runner.advanceTo(2520)
  assert.equal(hidden(runner), true)
  assert.ok(runner.events[0].at >= 2400 + 80)
})

test('a stalled image decode has a bounded warm-up deadline and does not trap visitors', async () => {
  const runner = opening()
  await runner.advanceTo(1000)
  const image = pendingImage()
  runner.api.ready([image])
  await runner.advanceTo(2799)
  assert.equal(hidden(runner), false)
  await runner.advanceTo(2920)
  assert.equal(runner.api.isFinished(), true)
  assert.ok(runner.events[0].at >= 1000 + 1800 + 80)
  assert.ok(runner.events[0].at < 3000)
})

test('a rejected or unsupported image decode still allows the original page to open', async () => {
  const runner = opening()
  runner.api.ready([
    { decode: () => Promise.reject(new Error('image failed')) },
    { decode: () => { throw new Error('decode unsupported') } },
    {},
  ])
  await runner.advanceTo(2320)
  assert.equal(runner.api.isFinished(), true)
  assert.equal(runner.nodes['opening-message'].hidden, true)
})

test('an unavailable module changes the counter to an explicit retry error after 25 seconds', async () => {
  const runner = opening()
  await runner.advanceTo(24999)
  assert.equal(runner.nodes['opening-message'].hidden, true)
  await runner.advanceTo(25000)
  assert.equal(runner.nodes['opening-count'].hidden, true)
  assert.equal(runner.nodes['opening-rule'].hidden, true)
  assert.equal(runner.nodes['opening-message'].hidden, false)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  assert.equal(runner.nodes['opening-loader'].getAttribute('role'), 'alert')
  assert.equal(hidden(runner), false)
  assert.equal(runner.events.length, 0)
  assert.equal(runner.tasks.size, 0)
  runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
  assert.equal(runner.reloads, 1)
})

test('an explicit bootstrap failure is immediate, stays failed, and never emits a finish event', async () => {
  const runner = opening()
  runner.api.fail()
  runner.api.fail()
  runner.api.ready([{ decode: () => assert.fail('a failed opening must not restart warming') }])
  await runner.advanceTo(30000)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  assert.equal(runner.api.isFinished(), false)
  assert.equal(runner.events.length, 0)
})

test('StrictMode-style duplicate ready calls decode once, finish once, and remove the overlay once', async () => {
  const runner = opening()
  const image = pendingImage()
  let reveals = 0
  const reveal = () => reveals++
  runner.document.addEventListener('portfolio-opening-finished', reveal, { once: true })
  runner.api.ready([image])
  runner.document.removeEventListener('portfolio-opening-finished', reveal)
  runner.document.addEventListener('portfolio-opening-finished', reveal, { once: true })
  runner.api.ready([image])
  assert.equal(image.calls, 1)
  image.resolve()
  await runner.advanceTo(30000)
  runner.api.ready([image])
  runner.api.fail()
  assert.equal(runner.events.length, 1)
  assert.equal(reveals, 1)
  assert.equal(runner.nodes['opening-loader'].removals, 1)
  assert.equal(runner.nodes['opening-message'].hidden, true)
  assert.equal(runner.tasks.size, 0)
})

test('App mounts all original sections immediately and only asks the opening to decode eager image covers', () => {
  assert.match(main, /<main>\s*<Hero\s+onReady=/)
  assert.match(main, /<About\s*\/>\s*<Marquee\s*\/>\s*<Services\s*\/>\s*<Projects\s*\/>/)
  assert.match(main, /opening\.ready\(\[\.\.\.document\.querySelectorAll\('#home \.reference-center-cover'\)\]\)/)
  assert.match(main, /<LazyImage\s+className="reference-center-cover"[^>]+loading="eager"/)
  assert.match(main, /\nmount\(\)\s*$/)
  assert.ok(!/\.mp4|fetch\s*\(|new\s+(?:Image|XMLHttpRequest)|createElement\s*\(/.test(bootstrap))
})
