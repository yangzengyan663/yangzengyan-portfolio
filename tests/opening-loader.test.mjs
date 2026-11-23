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
const percent = runner => Number.parseInt(runner.nodes['opening-count'].textContent)
const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, failed) => { resolve = done; reject = failed })
  return { promise, resolve, reject }
}
const job = (id, pending = deferred()) => {
  let calls = 0
  return { id, label: id, run: () => { calls++; return pending.promise }, pending, get calls() { return calls } }
}

test('the first HTML shows its numeric opening and remains at zero until resource work starts', async () => {
  assert.match(html, /id="opening-count"[^>]*>0%<\/span>/)
  assert.ok(html.indexOf('id="opening-loader"') < html.indexOf('id="root"'))
  assert.ok(html.indexOf('data-opening-bootstrap') < html.indexOf('type="module"'))
  assert.ok(!html.includes('portfolio-recovery'))
  assert.ok(!/<nav\b/.test(html))
  const runner = opening()
  assert.equal(typeof runner.api.start, 'function')
  assert.equal(percent(runner), 0)
  await runner.advanceTo(600000)
  assert.equal(percent(runner), 0)
  assert.equal(runner.api.isFinished(), false)
  assert.equal(hidden(runner), false)
  assert.equal(runner.nodes.root.hasAttribute('inert'), true)
  assert.equal(runner.events.length, 0)
})

test('progress counts only resolved resource jobs and includes the final display check', async () => {
  const runner = opening()
  const jobs = [job('one'), job('two'), job('three')]
  const display = deferred()
  let displayCalls = 0
  const mountedContent = { id: 'home', images: ['original covers'] }
  runner.nodes.root.children.push(mountedContent)
  runner.api.start(jobs, () => { displayCalls++; return display.promise })
  await runner.flush()
  assert.equal(percent(runner), 0)
  jobs[1].pending.resolve()
  await runner.flush()
  assert.equal(percent(runner), 25)
  assert.equal(runner.nodes['opening-loader'].style.getPropertyValue('--loader-progress'), .25)
  jobs[0].pending.resolve()
  await runner.flush()
  assert.equal(percent(runner), 50)
  jobs[2].pending.resolve()
  await runner.flush()
  assert.equal(percent(runner), 75)
  assert.equal(displayCalls, 1)
  await runner.advanceTo(600000)
  assert.equal(percent(runner), 75)
  assert.equal(hidden(runner), false)
  assert.equal(runner.nodes.root.hasAttribute('inert'), true)
  assert.deepEqual(runner.nodes.root.children, [mountedContent])
  display.resolve()
  await runner.flush()
  assert.equal(percent(runner), 100)
  assert.equal(runner.events.length, 0)
  await runner.advanceTo(600079)
  assert.equal(hidden(runner), false)
  await runner.advanceTo(600080)
  assert.equal(runner.api.isFinished(), true)
  assert.equal(hidden(runner), true)
  assert.equal(runner.nodes.root.hasAttribute('inert'), false)
  assert.equal(runner.nodes.root.hasAttribute('aria-hidden'), false)
  assert.equal(runner.document.documentElement.classList.contains('portfolio-loading'), false)
  assert.deepEqual(runner.nodes.root.children, [mountedContent])
})

test('pending jobs never gain progress from elapsed time or trigger display preparation', async () => {
  const runner = opening()
  const task = job('slow image')
  let displayCalls = 0
  runner.api.start([task], () => { displayCalls++ })
  await runner.advanceTo(3600000)
  assert.equal(task.calls, 1)
  assert.equal(percent(runner), 0)
  assert.equal(displayCalls, 0)
  assert.equal(runner.events.length, 0)
  assert.equal(runner.nodes['opening-retry'].hidden, true)
})

test('at most four resource jobs run concurrently and a completion frees the next slot', async () => {
  const runner = opening()
  const jobs = Array.from({ length: 6 }, (_, index) => job('image-' + index))
  const display = deferred()
  runner.api.start(jobs, () => display.promise)
  await runner.flush()
  assert.deepEqual(jobs.map(task => task.calls), [1, 1, 1, 1, 0, 0])
  jobs[0].pending.resolve()
  await runner.flush()
  assert.deepEqual(jobs.map(task => task.calls), [1, 1, 1, 1, 1, 0])
  jobs[1].pending.reject(new Error('network failure'))
  await runner.flush()
  assert.deepEqual(jobs.map(task => task.calls), [1, 1, 1, 1, 1, 1])
  for (const index of [2, 3, 4, 5]) jobs[index].pending.resolve()
  await runner.flush()
  assert.equal(percent(runner), 71)
  assert.equal(hidden(runner), false)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  assert.equal(runner.nodes['opening-loader'].getAttribute('role'), 'alert')
})

test('failed jobs do not count as complete and retry preserves successes while rerunning only failures', async () => {
  const runner = opening()
  const first = job('already loaded')
  const third = job('also loaded')
  const attempts = [deferred(), deferred()]
  let failedCalls = 0
  let displayCalls = 0
  const failed = { id: 'failed cover', label: 'Failed cover', run: () => attempts[failedCalls++].promise }
  const display = deferred()
  runner.api.start([first, failed, third], () => { displayCalls++; return display.promise })
  first.pending.resolve()
  third.pending.resolve()
  attempts[0].reject(new Error('cover unavailable'))
  await runner.flush()
  assert.equal(percent(runner), 50)
  assert.equal(displayCalls, 0)
  assert.equal(runner.nodes['opening-count'].hidden, false)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
  await runner.flush()
  assert.equal(first.calls, 1)
  assert.equal(third.calls, 1)
  assert.equal(failedCalls, 2)
  assert.equal(percent(runner), 50)
  assert.equal(runner.reloads, 0)
  attempts[1].resolve()
  await runner.flush()
  assert.equal(percent(runner), 75)
  assert.equal(displayCalls, 1)
  display.resolve()
  await runner.advanceTo(80)
  assert.equal(percent(runner), 100)
  assert.equal(runner.events.length, 1)
})

test('a failed final display check retries only that check and retains all loaded resources', async () => {
  const runner = opening()
  const jobs = [job('one'), job('two'), job('three')]
  const displays = [deferred(), deferred()]
  let displayCalls = 0
  runner.api.start(jobs, () => displays[displayCalls++].promise)
  jobs.forEach(task => task.pending.resolve())
  await runner.flush()
  displays[0].reject(new Error('the real DOM is not yet decoded'))
  await runner.flush()
  assert.equal(percent(runner), 75)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
  await runner.flush()
  assert.equal(displayCalls, 2)
  assert.deepEqual(jobs.map(task => task.calls), [1, 1, 1])
  assert.equal(percent(runner), 75)
  displays[1].resolve()
  await runner.advanceTo(80)
  assert.equal(percent(runner), 100)
  assert.equal(runner.api.isFinished(), true)
})

test('synchronous resource exceptions are failures and a later retry can recover', async () => {
  const runner = opening()
  let calls = 0
  const jobs = [
    { id: 'immediate', run: () => 42 },
    { id: 'throws', run: () => { if (++calls === 1) throw new Error('decode failed'); return 'decoded' } },
    { id: 'third', run: () => Promise.resolve() },
  ]
  runner.api.start(jobs, () => Promise.resolve())
  await runner.flush()
  assert.equal(percent(runner), 50)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
  await runner.advanceTo(80)
  assert.equal(calls, 2)
  assert.equal(percent(runner), 100)
  assert.equal(runner.events.length, 1)
})

test('duplicate resource ids have one fixed loading item and one separate display item', async () => {
  const runner = opening()
  const first = job('same image')
  const last = job('same image')
  const display = deferred()
  runner.api.start([first, last], () => display.promise)
  await runner.flush()
  assert.equal(first.calls, 0)
  assert.equal(last.calls, 1)
  last.pending.resolve()
  await runner.flush()
  assert.equal(percent(runner), 50)
  display.resolve()
  await runner.advanceTo(80)
  assert.equal(percent(runner), 100)
})

test('StrictMode-style duplicate start calls never restart work or finish more than once', async () => {
  const runner = opening()
  const task = job('real resource')
  const ignored = job('duplicate effect')
  const display = deferred()
  let reveals = 0
  const reveal = () => reveals++
  runner.document.addEventListener('portfolio-opening-finished', reveal, { once: true })
  runner.api.start([task], () => display.promise)
  runner.document.removeEventListener('portfolio-opening-finished', reveal)
  runner.document.addEventListener('portfolio-opening-finished', reveal, { once: true })
  runner.api.start([ignored], () => assert.fail('second startup must not replace the display check'))
  await runner.flush()
  assert.equal(task.calls, 1)
  assert.equal(ignored.calls, 0)
  task.pending.resolve()
  display.resolve()
  await runner.advanceTo(680)
  runner.api.start([ignored], () => {})
  runner.api.fail()
  assert.equal(runner.events.length, 1)
  assert.equal(reveals, 1)
  assert.equal(runner.nodes['opening-loader'].removals, 1)
  assert.equal(runner.api.isFinished(), true)
  assert.equal(runner.tasks.size, 0)
})

test('a fatal startup failure keeps the overlay and its button reloads instead of retrying resources', async () => {
  const runner = opening()
  runner.api.fail()
  runner.api.fail()
  runner.api.start([{ id: 'ignored', run: () => assert.fail('fatal startup must not launch resources') }], () => {})
  await runner.advanceTo(600000)
  assert.equal(percent(runner), 0)
  assert.equal(runner.nodes['opening-retry'].hidden, false)
  assert.equal(runner.nodes['opening-loader'].getAttribute('role'), 'alert')
  assert.equal(hidden(runner), false)
  assert.equal(runner.api.isFinished(), false)
  runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
  assert.equal(runner.reloads, 1)
})

test('a fatal error during resource loading prevents later resolutions from exposing the page', async () => {
  const runner = opening()
  const task = job('pending at failure')
  let displayCalls = 0
  runner.api.start([task], () => { displayCalls++ })
  runner.api.fail()
  task.pending.resolve()
  await runner.advanceTo(600000)
  assert.equal(percent(runner), 0)
  assert.equal(displayCalls, 0)
  assert.equal(runner.events.length, 0)
  assert.equal(runner.nodes.root.hasAttribute('inert'), true)
  assert.equal(hidden(runner), false)
})

test('invalid task contracts become an explicit fatal startup error', () => {
  for (const tasks of [undefined, [{ id: 'missing run' }], [{ run() {} }]]) {
    const runner = opening()
    runner.api.start(tasks, () => {})
    assert.equal(runner.nodes['opening-retry'].hidden, false)
    assert.equal(runner.nodes['opening-loader'].getAttribute('role'), 'alert')
    runner.nodes['opening-retry'].dispatchEvent(new Event('click'))
    assert.equal(runner.reloads, 1)
  }
})

test('an empty resource list still waits for the real display check rather than reporting automatic success', async () => {
  const runner = opening()
  const display = deferred()
  let displayCalls = 0
  runner.api.start([], () => { displayCalls++; return display.promise })
  await runner.advanceTo(600000)
  assert.equal(displayCalls, 1)
  assert.equal(percent(runner), 0)
  display.resolve()
  await runner.advanceTo(600080)
  assert.equal(percent(runner), 100)
  assert.equal(runner.api.isFinished(), true)
})

test('the original App mounts immediately and the bootstrap issues no independent media requests', () => {
  assert.match(main, /<main>\s*<Hero\s+onReady=/)
  assert.match(main, /<About\s*\/>\s*<Marquee\s*\/>\s*<Services\s*\/>\s*<Projects\s*\/>/)
  assert.match(main, /openingPreparation\(\)/)
  assert.match(main, /opening\.start\(tasks, finalize\)/)
  assert.match(main, /\nmount\(\)\s*$/)
  assert.ok(!/\.mp4|fetch\s*\(|new\s+(?:Image|XMLHttpRequest)|createElement\s*\(/.test(bootstrap))
})
