import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { bindHoverPreview } from '../src/hoverPreviewController.js'

const original = Object.fromEntries(['document', 'window', 'IntersectionObserver', 'setTimeout', 'clearTimeout'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
let now, timers, nextTimer, cleanups
const flush = async () => { for (let step = 0; step < 4; step++) await Promise.resolve() }

class Target extends EventTarget {
  listeners = new Map()
  addEventListener(type, callback, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(callback)
    super.addEventListener(type, callback, options)
  }
  removeEventListener(type, callback, options) {
    this.listeners.get(type)?.delete(callback)
    super.removeEventListener(type, callback, options)
  }
  emit(type, properties = {}) {
    const event = new Event(type)
    for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { value })
    this.dispatchEvent(event)
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0) }
}

class Host extends Target {
  focusVisible = false
  child = {}
  bounds = { top: 100, bottom: 300 }
  matches(selector) { assert.equal(selector, ':focus-visible'); return this.focusVisible }
  contains(node) { return node === this.child }
  getBoundingClientRect() { return this.bounds }
}

class Video extends Target {
  assignments = []
  paused = true
  playCalls = 0
  pauseCalls = 0
  loadCalls = 0
  muted = false
  behavior = () => Promise.resolve()
  set src(value) { this._src = value; this.assignments.push(value) }
  get src() { return this._src || '' }
  play() { this.playCalls++; this.paused = false; return this.behavior() }
  pause() { this.pauseCalls++; this.paused = true }
  removeAttribute(name) { assert.equal(name, 'src'); this._src = '' }
  load() { this.loadCalls++ }
}

class Observer {
  static instances = []
  targets = new Set()
  disconnects = 0
  constructor(callback) { this.callback = callback; Observer.instances.push(this) }
  observe(target) { this.targets.add(target) }
  disconnect() { this.targets.clear(); this.disconnects++ }
  leave() { this.callback([{ isIntersecting: false }]) }
}

beforeEach(() => {
  now = 0
  nextTimer = 0
  timers = new Map()
  cleanups = []
  Observer.instances = []
  const document = new Target()
  document.hidden = false
  const window = new Target()
  window.innerHeight = 800
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: document },
    window: { configurable: true, value: window },
    IntersectionObserver: { configurable: true, value: Observer },
    setTimeout: { configurable: true, writable: true, value: (callback, delay = 0) => {
      const id = ++nextTimer
      timers.set(id, { at: now + delay, callback })
      return id
    } },
    clearTimeout: { configurable: true, writable: true, value: id => timers.delete(id) },
  })
})

afterEach(async () => {
  cleanups.forEach(dispose => dispose())
  await flush()
  for (const [name, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

async function advance(milliseconds) {
  const target = now + milliseconds
  while (true) {
    const next = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
    if (!next) break
    const [id, timer] = next
    timers.delete(id)
    now = timer.at
    timer.callback()
    await flush()
  }
  now = target
  await flush()
}

function preview(source = '/hover-previews/first.mp4', video = new Video()) {
  const host = new Host()
  const state = { active: false, activations: 0, deactivations: 0, playing: 0, allowed: true }
  let controller
  controller = bindHoverPreview(host, {
    source,
    canStart: () => state.allowed,
    onActivate: () => { state.active = true; state.activations++; controller.attachVideo(video) },
    onDeactivate: () => { state.active = false; state.deactivations++ },
    onPlaying: () => state.playing++,
  })
  cleanups.push(() => controller.dispose())
  return { host, video, state, controller, enter: () => host.emit('pointerenter', { pointerType: 'mouse' }), leave: () => host.emit('pointerleave') }
}

function released(item) {
  assert.equal(item.state.active, false)
  assert.equal(item.video.paused, true)
  assert.equal(item.video.src, '')
  assert.equal(item.video.listenerCount, 0)
  assert.equal(document.listenerCount, 0)
  assert.equal(window.listenerCount, 0)
  assert.equal(timers.size, 0)
}

test('binding a cover causes no activation, video source, timer or network work', async () => {
  const item = preview()
  await advance(10000)
  assert.equal(item.state.activations, 0)
  assert.deepEqual(item.video.assignments, [])
  assert.equal(item.video.playCalls, 0)
  assert.equal(Observer.instances.length, 0)
  assert.equal(timers.size, 0)
  assert.equal(document.listenerCount, 0)
})

test('a brief pointer pass is cancelled before any clip source is assigned', async () => {
  const item = preview()
  item.enter()
  await advance(179)
  item.leave()
  await advance(1000)
  assert.equal(item.state.activations, 0)
  assert.deepEqual(item.video.assignments, [])
  released(item)
  assert.equal(Observer.instances[0].targets.size, 0)
})

test('a sustained mouse hover plays one muted clip, then leaving releases its source and cover state', async () => {
  const item = preview()
  item.enter()
  await advance(180)
  assert.equal(item.state.active, true)
  assert.deepEqual(item.video.assignments, ['/hover-previews/first.mp4'])
  assert.equal(item.video.playCalls, 1)
  assert.equal(item.video.muted, true)
  assert.equal(item.state.playing, 0, 'cover stays until a real playing event')
  item.video.emit('playing')
  assert.equal(item.state.playing, 1)
  item.leave()
  released(item)
  assert.equal(item.video.pauseCalls, 1)
  assert.equal(item.video.loadCalls, 1)
  assert.equal(item.state.deactivations, 1)
  item.video.emit('playing')
  assert.equal(item.state.playing, 1, 'stale playing events cannot restore the video layer')
})

test('moving between repeated tiles stops the old lease immediately and only starts the new clip', async () => {
  const first = preview('/hover-previews/first.mp4')
  const second = preview('/hover-previews/second.mp4')
  first.enter()
  await advance(180)
  second.enter()
  assert.equal(first.video.paused, true)
  assert.equal(first.video.src, '')
  assert.equal(first.state.active, false)
  assert.deepEqual(second.video.assignments, [])
  first.leave() // Late pointerleave from the old tile must not cancel the new one.
  await advance(180)
  assert.equal(second.state.active, true)
  assert.deepEqual(second.video.assignments, ['/hover-previews/second.mp4'])
  second.leave()
  released(second)
})

test('a second pending hover cancels the first timer without downloading the first clip', async () => {
  const first = preview('/hover-previews/first.mp4')
  const second = preview('/hover-previews/second.mp4')
  first.enter()
  await advance(100)
  second.enter()
  await advance(180)
  assert.equal(first.state.activations, 0)
  assert.deepEqual(first.video.assignments, [])
  assert.equal(second.state.active, true)
})

test('touch and ordinary mouse-click focus do not start automatic preview downloads', async () => {
  const item = preview()
  item.host.emit('pointerenter', { pointerType: 'touch' })
  item.host.emit('focusin')
  await advance(1000)
  assert.equal(item.state.activations, 0)
  assert.deepEqual(item.video.assignments, [])
  assert.equal(timers.size, 0)
})

test('keyboard focus previews accessibly and blur outside the tile restores its cover', async () => {
  const item = preview()
  item.host.focusVisible = true
  item.host.emit('focusin')
  await advance(180)
  assert.equal(item.state.active, true)
  item.host.emit('focusout', { relatedTarget: item.host.child })
  assert.equal(item.state.active, true)
  item.host.emit('focusout', { relatedTarget: {} })
  released(item)
})

test('the opening/main-player gate is checked both before the delay and before activation', async () => {
  const item = preview()
  item.state.allowed = false
  item.enter()
  await advance(1000)
  assert.equal(item.state.activations, 0)
  assert.equal(Observer.instances.length, 0)
  item.state.allowed = true
  item.enter()
  item.state.allowed = false
  await advance(180)
  assert.equal(item.state.activations, 0)
  released(item)
})

for (const [name, interrupt] of [
  ['a hidden page', () => { document.hidden = true; document.emit('visibilitychange') }],
  ['window blur', () => window.emit('blur')],
  ['the full player opening', item => { item.state.allowed = false; document.emit('portfolio-player-change') }],
  ['scrolling the tile beyond the viewport', item => { item.host.bounds = { top: 810, bottom: 1010 }; window.emit('scroll') }],
  ['the intersection observer reporting offscreen', () => Observer.instances.at(-1).leave()],
]) {
  test(`${name} stops playback and detaches preview work`, async () => {
    const item = preview()
    item.enter()
    await advance(180)
    interrupt(item)
    released(item)
    assert.equal(item.state.deactivations, 1)
    assert.equal(Observer.instances.at(-1).targets.size, 0)
  })
}

test('a rejected play promise or media error restores the cover without retry loops', async () => {
  const rejected = new Video()
  rejected.behavior = () => Promise.reject(new Error('Autoplay denied'))
  const first = preview('/hover-previews/denied.mp4', rejected)
  first.enter()
  await advance(180)
  released(first)
  assert.equal(first.video.playCalls, 1)
  const second = preview('/hover-previews/broken.mp4')
  second.enter()
  await advance(180)
  second.video.emit('error')
  released(second)
  await advance(10000)
  assert.equal(second.video.playCalls, 1)
})

test('a late rejected promise from the old clip cannot stop the new active tile', async () => {
  let rejectPlay
  const oldVideo = new Video()
  oldVideo.behavior = () => new Promise((_, reject) => { rejectPlay = reject })
  const old = preview('/hover-previews/old.mp4', oldVideo)
  const current = preview('/hover-previews/current.mp4')
  old.enter()
  await advance(180)
  current.enter()
  await advance(180)
  rejectPlay(new Error('Old playback aborted'))
  await flush()
  assert.equal(current.state.active, true)
  assert.equal(current.video.src, '/hover-previews/current.mp4')
  assert.equal(current.video.paused, false)
})

test('a synchronous native play exception restores the cover and releases the clip', async () => {
  const video = new Video()
  video.behavior = () => { throw new Error('Native playback unavailable') }
  const item = preview('/hover-previews/unsupported.mp4', video)
  item.enter()
  await advance(180)
  released(item)
})

test('dispose cancels pending intent and removes every host/global listener', async () => {
  const item = preview()
  item.enter()
  item.controller.dispose()
  assert.equal(item.host.listenerCount, 0)
  item.enter()
  item.host.focusVisible = true
  item.host.emit('focusin')
  await advance(1000)
  assert.equal(item.state.activations, 0)
  assert.deepEqual(item.video.assignments, [])
  released(item)
  item.controller.attachVideo(new Video())()
  assert.equal(item.video.playCalls, 0)
})

test('unmounting an active preview releases its decoder and stale media handlers', async () => {
  const item = preview()
  item.enter()
  await advance(180)
  item.controller.dispose()
  released(item)
  assert.equal(item.host.listenerCount, 0)
  assert.equal(item.video.pauseCalls, 1)
  assert.equal(item.video.loadCalls, 1)
  item.video.emit('playing')
  item.video.emit('error')
  await advance(1000)
  assert.equal(item.state.playing, 0)
  assert.equal(item.state.deactivations, 1)
})
