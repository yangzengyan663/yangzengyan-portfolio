import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'

const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const packA = {
  url: '/display-packs/a-0123456789abcdef.bin', bytes: 8,
  images: [
    { source: '/images/a.webp', offset: 0, length: 4, type: 'image/webp' },
    { source: '/images/b.jpg', offset: 4, length: 4, type: 'image/jpeg' },
  ],
}
const packB = {
  url: '/display-packs/b-fedcba9876543210.bin', bytes: 3,
  images: [{ source: '/images/c.png', offset: 0, length: 3, type: 'image/png' }],
}
const bodies = new Map([[packA.url, Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8)], [packB.url, Uint8Array.of(9, 10, 11)]])
const responseFor = bytes => new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } })
const origin = 'https://portfolio.test'
const packUrl = pack => origin + '/pack-test' + pack.url
const deferred = () => {
  let resolve, reject
  const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse })
  return { promise, resolve, reject }
}
let instance = 0

async function fixture(t, { cached = [], fetchResponse, cacheOpenError, cacheWriteError } = {}) {
  const priorFetch = globalThis.fetch
  const priorCaches = globalThis.caches
  const priorCreate = URL.createObjectURL
  const priorDocument = globalThis.document
  const calls = [], blobs = new Map(), stored = new Map(cached.map(([key, value]) => [new URL(key, origin).href, value])), writes = []
  const key = request => typeof request === 'string' ? request : request.url
  const cache = {
    async match(request) { return stored.get(key(request))?.clone() },
    put(request, response) {
      const write = (async () => {
        if (cacheWriteError) throw cacheWriteError
        const bytes = await response.arrayBuffer()
        stored.set(key(request), responseFor(bytes))
      })()
      writes.push(write.catch(() => {}))
      return write
    },
    async delete(request) { return stored.delete(key(request)) },
  }
  globalThis.caches = {
    async open() { if (cacheOpenError) throw cacheOpenError; return cache },
    async match(request) { if (cacheOpenError) throw cacheOpenError; return cache.match(request) },
  }
  globalThis.document = { baseURI: origin + '/portfolio/' }
  globalThis.fetch = async request => {
    const url = key(request)
    calls.push(url)
    if (fetchResponse) return fetchResponse(url)
    const original = [...bodies.keys()].find(path => url.endsWith(path))
    assert.ok(original, `unexpected network request: ${url}`)
    return responseFor(bodies.get(original))
  }
  URL.createObjectURL = blob => {
    const url = `blob:pack-test/${blobs.size + 1}`
    blobs.set(url, blob)
    return url
  }
  t.after(() => {
    globalThis.fetch = priorFetch
    URL.createObjectURL = priorCreate
    if (priorCaches === undefined) delete globalThis.caches
    else globalThis.caches = priorCaches
    if (priorDocument === undefined) delete globalThis.document
    else globalThis.document = priorDocument
  })
  const manifest = moduleUrl(`export default ${JSON.stringify([packA, packB])}`)
  const paths = moduleUrl(`export const assetUrl = path => '/pack-test' + path;`)
  const source = await fs.readFile(new URL('../src/displayImagePack.js', import.meta.url), 'utf8')
  const code = source
    .replace(/(['"])\.\/displayPackManifest(?:\.js)?\1/g, JSON.stringify(manifest))
    .replace(/(['"])\.\/assetPaths(?:\.js)?\1/g, JSON.stringify(paths))
    + `\n// isolated display-pack test ${++instance}`
  const api = await import(moduleUrl(code))
  return { api, calls, blobs, stored, writes }
}

test('two images in one pack share one fetch and preserve their own bytes and MIME types', async t => {
  const gate = deferred()
  const { api, calls, blobs } = await fixture(t, { fetchResponse: () => gate.promise })
  assert.equal(api.hasPackedImage('/images/a.webp'), true)
  assert.equal(api.hasPackedImage('/videos/full-film.mp4'), false)
  const first = api.packedImageUrl('/images/a.webp')
  const second = api.packedImageUrl('/images/b.jpg')
  gate.resolve(responseFor(bodies.get(packA.url)))
  const [a, b] = await Promise.all([first, second])
  assert.equal(calls.length, 1)
  assert.equal(calls[0], packUrl(packA))
  assert.notEqual(a, b)
  assert.equal(blobs.get(a).type, 'image/webp')
  assert.equal(blobs.get(b).type, 'image/jpeg')
  assert.deepEqual([...new Uint8Array(await blobs.get(a).arrayBuffer())], [1, 2, 3, 4])
  assert.deepEqual([...new Uint8Array(await blobs.get(b).arrayBuffer())], [5, 6, 7, 8])
  assert.equal(await api.packedImageUrl('/images/a.webp'), a)
  assert.equal(blobs.size, 2)
  assert.equal(calls.length, 1)
})

test('a different pack is fetched only when one of its images is requested', async t => {
  const { api, calls, blobs } = await fixture(t)
  await api.packedImageUrl('/images/b.jpg')
  assert.deepEqual(calls, [packUrl(packA)])
  const c = await api.packedImageUrl('/images/c.png')
  assert.deepEqual(calls, [packUrl(packA), packUrl(packB)])
  assert.deepEqual([...new Uint8Array(await blobs.get(c).arrayBuffer())], [9, 10, 11])
  assert.ok(calls.every(url => !/\.(?:mp4|webm)(?:$|[?#])/.test(url)))
})

test('a valid persistent cache hit prepares the image without a network request', async t => {
  const { api, calls, blobs } = await fixture(t, {
    cached: [['/pack-test' + packA.url, responseFor(bodies.get(packA.url))]],
  })
  const url = await api.packedImageUrl('/images/a.webp')
  assert.equal(calls.length, 0)
  assert.deepEqual([...new Uint8Array(await blobs.get(url).arrayBuffer())], [1, 2, 3, 4])
})

test('incorrect pack length rejects all of its images and does not repeatedly download the failed pack', async t => {
  const { api, calls, blobs } = await fixture(t, { fetchResponse: () => responseFor(Uint8Array.of(1, 2)) })
  await assert.rejects(api.packedImageUrl('/images/a.webp'))
  await assert.rejects(api.packedImageUrl('/images/b.jpg'))
  assert.equal(calls.length, 1)
  assert.equal(blobs.size, 0)
})

test('HTTP errors are not converted into image blobs or cached as successful content', async t => {
  const { api, calls, blobs, stored, writes } = await fixture(t, {
    fetchResponse: () => new Response('unavailable', { status: 503 }),
  })
  await assert.rejects(api.packedImageUrl('/images/a.webp'))
  await assert.rejects(api.packedImageUrl('/images/b.jpg'))
  await Promise.all(writes)
  assert.equal(calls.length, 1)
  assert.equal(blobs.size, 0)
  assert.equal(stored.size, 0)
})

test('cache storage permission failures leave a successful network load usable', async t => {
  const { api, calls, blobs } = await fixture(t, { cacheOpenError: new DOMException('denied', 'SecurityError') })
  const url = await api.packedImageUrl('/images/a.webp')
  assert.equal(calls.length, 1)
  assert.equal(blobs.get(url).size, 4)
})

test('a cache write failure does not reject already downloaded image content', async t => {
  const { api, calls, blobs, writes } = await fixture(t, { cacheWriteError: new DOMException('full', 'QuotaExceededError') })
  const url = await api.packedImageUrl('/images/c.png')
  await Promise.all(writes)
  assert.equal(calls.length, 1)
  assert.equal(blobs.get(url).type, 'image/png')
})

test('successful responses are retained under the content-versioned pack URL', async t => {
  const { api, stored, writes } = await fixture(t)
  await api.packedImageUrl('/images/a.webp')
  await Promise.all(writes)
  assert.ok(stored.has(packUrl(packA)))
  assert.equal((await stored.get(packUrl(packA)).arrayBuffer()).byteLength, packA.bytes)
})
import fsSync from 'node:fs'
import { createHash } from 'node:crypto'
import displayPacks from '../src/displayPackManifest.js'

test('the shipped section packs contain all 42 real images with valid ranges and content versions', () => {
  const sources = new Set();
  for (const pack of displayPacks) {
    const bytes = fsSync.readFileSync(new URL('../dist-github' + pack.url, import.meta.url));
    assert.equal(bytes.length, pack.bytes);
    assert.ok(pack.url.includes(createHash('sha256').update(bytes).digest('hex').slice(0, 16)));
    let next = 0;
    for (const image of pack.images) {
      assert.equal(image.offset, next);
      assert.ok(image.length > 0);
      assert.ok(!sources.has(image.source));
      sources.add(image.source);
      const data = bytes.subarray(image.offset, image.offset + image.length);
      if (image.type === 'image/webp') assert.equal(data.toString('ascii', 8, 12), 'WEBP');
      else assert.equal(image.type, 'image/svg+xml');
      next += image.length;
    }
    assert.equal(next, bytes.length);
  }
  assert.equal(sources.size, 42);
  assert.equal(displayPacks.find(pack => pack.group === 'home').images.length, 6);
  assert.ok(displayPacks.find(pack => pack.group === 'home').bytes < 200000);
});
