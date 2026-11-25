import displayPacks from './displayPackManifest.js'
import { assetUrl } from './assetPaths.js'

const entries = new Map(displayPacks.flatMap(pack => pack.images.map(image => [image.source, { pack, image }])))
const pending = new Map()
const objectUrls = new Map()
const cacheName = 'portfolio-display-packs-v1'

export const hasPackedImage = source => entries.has(source)

async function readPack(pack) {
  const url = new URL(assetUrl(pack.url), document.baseURI).href
  let cache
  try { cache = await globalThis.caches?.open(cacheName) } catch {}
  try {
    const cached = await cache?.match(url)
    if (cached) {
      const bytes = await cached.arrayBuffer()
      if (bytes.byteLength === pack.bytes) return bytes
      await cache.delete(url)
    }
  } catch {}
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error('Display image pack is unavailable')
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength !== pack.bytes) throw new Error('Display image pack is incomplete')
  try {
    await cache?.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }))
  } catch {}
  return bytes
}

export async function packedImageUrl(source) {
  const entry = entries.get(source)
  if (!entry) throw new Error('Image does not belong to a display pack')
  if (objectUrls.has(source)) return objectUrls.get(source)
  const { pack, image } = entry
  // Keep a failed request for this visit too; falling back must not send the
  // same broken pack request once for every cover in its section.
  if (!pending.has(pack.url)) pending.set(pack.url, readPack(pack))
  const bytes = await pending.get(pack.url)
  if (!objectUrls.has(source)) {
    if (image.offset < 0 || image.length <= 0 || image.offset + image.length > bytes.byteLength) throw new Error('Invalid display image range')
    objectUrls.set(source, URL.createObjectURL(new Blob([bytes.slice(image.offset, image.offset + image.length)], { type: image.type })))
  }
  return objectUrls.get(source)
}
