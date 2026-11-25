import { useCallback, useSyncExternalStore } from 'react'
import { assetUrl } from './assetPaths.js'
import { hasPackedImage, packedImageUrl } from './displayImagePack.js'

const images = new Map()
const subscribers = new Map()
const serverSnapshot = () => false
export const preparedImageSource = source => images.get(source)?.ready ? images.get(source).url : undefined

// Only full image sources belong in this cache. In particular, never turn a
// film URL or an inline placeholder into an opening-time media request.
export function prepareImage(source) {
  if (typeof source !== 'string' || !/\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(source.split(/[?#]/)[0])) {
    return Promise.reject(new TypeError('Only a static image source can be prepared'))
  }
  const cached = images.get(source)
  if (cached) return cached.promise

  let resolve, reject
  const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse })
  const record = { promise, ready: false, image: null }
  images.set(source, record)
  let image, settled = false, decoding = false
  const cleanup = () => {
    if (!image) return
    image.onload = null
    image.onerror = null
  }
  const fail = error => {
    if (settled) return
    settled = true
    cleanup()
    if (images.get(source) === record) images.delete(source)
    reject(error instanceof Error ? error : new Error('Image preparation failed: ' + source))
  }
  const loaded = async () => {
    if (settled || decoding) return
    decoding = true
    try {
      if (!(image.naturalWidth > 0)) throw new Error('Image has no decoded pixels: ' + source)
      if (typeof image.decode === 'function') await image.decode()
      if (!(image.naturalWidth > 0)) throw new Error('Image has no decoded pixels: ' + source)
    } catch (error) { fail(error); return }
    if (settled) return
    settled = true
    cleanup()
    record.ready = true
    record.image = image // Retain the prepared resource for the gallery.
    resolve(image)
    for (const notify of [...(subscribers.get(source) || [])]) notify()
  }
  const assign = url => { try {
    record.url = url
    image = new Image()
    image.loading = 'eager'
    image.decoding = 'async'
    image.onload = loaded
    image.onerror = () => fail(new Error('Image could not be loaded: ' + source))
    image.src = url
    // A cached resource can already be complete before the load callback runs.
    if (image.complete && image.naturalWidth > 0) loaded()
  } catch (error) { fail(error) } }
  if (hasPackedImage(source)) packedImageUrl(source).then(assign, () => assign(assetUrl(source)))
  else assign(assetUrl(source))
  return promise
}

export function usePreparedImage(source) {
  const subscribe = useCallback(notify => {
    if (typeof source !== 'string' || !source) return () => {}
    let listeners = subscribers.get(source)
    if (!listeners) { listeners = new Set(); subscribers.set(source, listeners) }
    listeners.add(notify)
    return () => {
      listeners.delete(notify)
      if (!listeners.size && subscribers.get(source) === listeners) subscribers.delete(source)
    }
  }, [source])
  const snapshot = useCallback(() => images.get(source)?.ready === true, [source])
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
