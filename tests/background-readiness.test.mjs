import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { markBackgroundReady, waitForBackgrounds } from '../src/backgroundReadiness.js'

const prior = globalThis.document
let hosts
beforeEach(() => {
  hosts = [{ dataset: {} }, { dataset: {} }]
  globalThis.document = new EventTarget()
  document.querySelectorAll = selector => { assert.equal(selector, '[data-opening-background]'); return hosts }
})
afterEach(() => { if (prior === undefined) delete globalThis.document; else globalThis.document = prior })

test('a mounted or downloading background is not yet a rendered background', async () => {
  let finished = false
  const pending = waitForBackgrounds().then(() => { finished = true })
  hosts[0].dataset.backgroundReady = 'loading'
  document.dispatchEvent(new Event('portfolio-background-ready'))
  await Promise.resolve()
  assert.equal(finished, false)
  markBackgroundReady(hosts[0])
  await Promise.resolve()
  assert.equal(finished, false)
  markBackgroundReady(hosts[1])
  await pending
  assert.equal(finished, true)
})

test('an actually painted compatibility background can replace an unavailable GPU effect', async () => {
  const pending = waitForBackgrounds()
  markBackgroundReady(hosts[0], 'webgl')
  markBackgroundReady(hosts[1], 'compatibility')
  await pending
  assert.equal(hosts[1].dataset.backgroundReady, 'compatibility')
})

test('already rendered backgrounds are ready immediately and duplicate notifications are ignored', async () => {
  let events = 0
  document.addEventListener('portfolio-background-ready', () => events++)
  markBackgroundReady(hosts[0])
  markBackgroundReady(hosts[0])
  markBackgroundReady(hosts[1])
  assert.equal(events, 2)
  await waitForBackgrounds()
})

test('missing background elements cannot masquerade as a complete scene', async () => {
  hosts = []
  await assert.rejects(waitForBackgrounds(), /not mounted/)
})
