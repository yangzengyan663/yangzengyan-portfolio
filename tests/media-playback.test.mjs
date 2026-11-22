import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import { startPlayback } from '../src/playbackController.js'
import { choosePlaybackSources, orderedPlaybackSources, playbackCandidates, rememberPlaybackSource, forgetPlaybackSource, reducePreviewTraffic } from '../src/media.js'

const source = '/videos/chinese-culture/jinshan.mp4'
const [origin, backup] = playbackCandidates(source)
const real = { setTimeout, clearTimeout, fetch, now: Date.now, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'), document: globalThis.document }
let clock = 1_000_000
let timers
let requests
let cleanups
const flush = () => new Promise(resolve => setImmediate(resolve))
const pendingFetch = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))

class FakeVideo extends EventTarget {
  assignments = []
  currentTime = 0
  duration = 100
  readyState = 0
  paused = true
  ended = false
  error = null
  set src(value) {
    this._src = value
    this.assignments.push(value)
    this.currentTime = 0
    this.readyState = 0
    this.error = null
    this.paused = true
  }
  get src() { return this._src }
  play() { this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve() }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  removeAttribute(name) { if (name === 'src') this._src = '' }
  load() {}
  emit(name) { this.dispatchEvent(new Event(name)) }
}

beforeEach(() => {
  clock += 1_000_000
  Date.now = () => clock
  rememberPlaybackSource(origin)
  clock += 120_001 // Expire any preference and prior test's failure cooldown.
  timers = new Map()
  requests = []
  cleanups = []
  let id = 0
  globalThis.setTimeout = (callback, ms) => { timers.set(++id, { callback, ms }); return id }
  globalThis.clearTimeout = id => timers.delete(id)
  globalThis.fetch = (url, options) => { requests.push(url); return pendingFetch(url, options) }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { connection: { effectiveType: '4g', saveData: false } } })
  globalThis.document = { documentElement: { dataset: {} } }
})
afterEach(async () => {
  cleanups.forEach(cleanup => cleanup())
  await flush()
  globalThis.setTimeout = real.setTimeout
  globalThis.clearTimeout = real.clearTimeout
  globalThis.fetch = real.fetch
  Date.now = real.now
  if (real.navigator) Object.defineProperty(globalThis, 'navigator', real.navigator)
  else delete globalThis.navigator
  if (real.document) globalThis.document = real.document
  else delete globalThis.document
})
const start = (video, options = {}) => {
  const statuses = []
  const cleanup = startPlayback(video, source, { onStatus: status => statuses.push(status), ...options })
  let closed = false
  cleanups.push(() => { if (!closed) { closed = true; cleanup() } })
  return { statuses, close: cleanups.at(-1) }
}
const deadline = () => {
  const entry = [...timers.entries()].find(([, timer]) => timer.ms === 4500)
  assert.ok(entry, 'playback watchdog is armed')
  timers.delete(entry[0])
  entry[1].callback()
}

test('native playback starts synchronously while source probes remain pending', () => {
  const video = new FakeVideo()
  start(video)
  assert.equal(video.src, origin)
  assert.equal(video.paused, false)
  assert.equal(requests.length, 2)
})

test('a fast alternate probe switches an unready video without waiting for the watchdog', async () => {
  globalThis.fetch = (url, options) => url === backup
    ? Promise.resolve(new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), { status: 206 }))
    : pendingFetch(url, options)
  const video = new FakeVideo()
  start(video)
  assert.equal(video.src, origin)
  await flush()
  await flush()
  assert.deepEqual(video.assignments, [origin, backup])
})

test('a decoded first frame cancels probing and never restarts the film', async () => {
  const video = new FakeVideo()
  const player = start(video)
  video.readyState = 2
  video.emit('loadeddata')
  await flush()
  assert.equal(player.statuses.at(-1), 'ready')
  assert.deepEqual(video.assignments, [origin])
  assert.equal(timers.size, 0)
})

test('stalled playback switches source and restores its position', () => {
  const video = new FakeVideo()
  start(video)
  video.readyState = 2
  video.currentTime = 23.5
  video.emit('loadeddata')
  video.emit('waiting')
  deadline()
  assert.equal(video.src, backup)
  video.emit('loadedmetadata')
  assert.equal(video.currentTime, 23.5)
  assert.equal(orderedPlaybackSources(source)[0], backup, 'failed source loses preference')
})

test('an explicit retry retains the saved position even before new metadata arrives', () => {
  let position = 0
  const first = new FakeVideo()
  const firstPlayer = start(first, { initialPosition: 14, onPosition: value => { position = value } })
  firstPlayer.close()
  assert.equal(position, 14)
  const retry = new FakeVideo()
  start(retry, { initialPosition: position })
  retry.emit('loadedmetadata')
  assert.equal(retry.currentTime, 14)
})

test('a paused video does not switch sources after a buffering deadline', () => {
  const video = new FakeVideo()
  const player = start(video)
  video.pause()
  assert.equal(player.statuses.at(-1), 'paused')
  assert.equal([...timers.values()].filter(timer => timer.ms === 4500).length, 0)
  assert.deepEqual(video.assignments, [origin])
})

test('terminal media errors report an error after both sources fail', () => {
  const video = new FakeVideo()
  const player = start(video)
  video.error = { code: 2 }
  video.emit('error')
  assert.equal(video.src, backup)
  video.error = { code: 2 }
  video.emit('error')
  assert.equal(player.statuses.at(-1), 'error')
})

test('autoplay denial leaves native controls available without repeated source switches', async () => {
  const video = new FakeVideo()
  video.play = () => Promise.reject(new DOMException('User gesture required', 'NotAllowedError'))
  const player = start(video)
  await flush()
  assert.equal(player.statuses.at(-1), 'paused')
  assert.deepEqual(video.assignments, [origin])
  assert.equal([...timers.values()].filter(timer => timer.ms === 4500).length, 0)
})

test('closing the player removes listeners and aborts all outstanding work', async () => {
  const video = new FakeVideo()
  const player = start(video)
  player.close()
  const count = player.statuses.length
  video.error = { code: 2 }
  video.emit('error')
  await flush()
  assert.equal(player.statuses.length, count)
  assert.equal(video.src, '')
  assert.equal(timers.size, 0)
})

test('source preference expires and a failed preferred source is demoted', () => {
  rememberPlaybackSource(backup)
  assert.equal(orderedPlaybackSources(source)[0], backup)
  clock += 120_001
  assert.equal(orderedPlaybackSources(source)[0], origin)
  rememberPlaybackSource(backup)
  forgetPlaybackSource(backup)
  assert.equal(orderedPlaybackSources(source)[0], origin)
})

test('an already cancelled selection makes no new fetches', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(choosePlaybackSources(source, controller.signal), { name: 'AbortError' })
  assert.equal(requests.length, 0)
})

test('slow connections and save-data mode retain posters without automatic previews', () => {
  assert.equal(reducePreviewTraffic(), false)
  for (const type of ['slow-2g', '2g', '3g']) {
    navigator.connection.effectiveType = type
    assert.equal(reducePreviewTraffic(), true)
  }
  navigator.connection.effectiveType = '4g'
  navigator.connection.saveData = true
  assert.equal(reducePreviewTraffic(), true)
  navigator.connection.saveData = false
  document.documentElement.dataset.connectionMode = 'lite'
  assert.equal(reducePreviewTraffic(), true)
})

