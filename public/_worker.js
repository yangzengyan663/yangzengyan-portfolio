// Only /media/* invokes this worker. All pages and previews remain static assets.
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { start, end } : null
}

function sliceStream(body, start, end) {
  const reader = body.getReader()
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); return }
          const chunkStart = offset
          offset += value.byteLength
          if (offset > start) controller.enqueue(value.subarray(Math.max(0, start - chunkStart), Math.min(value.byteLength, end - chunkStart + 1)))
          if (offset > end) { controller.close(); await reader.cancel(); return }
          if (offset > start) return
        }
      } catch (error) { controller.error(error) }
    },
    cancel(reason) { return reader.cancel(reason) },
  })
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/media/')) return env.ASSETS.fetch(request)
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    let path
    try { path = decodeURIComponent(url.pathname.slice('/media/'.length)) } catch { return new Response(null, { status: 400 }) }
    if (!/^[\w /.-]+\.mp4$/.test(path) || path.split('/').includes('..')) return new Response(null, { status: 404 })

    // Versioned, same-origin cache keys prevent stale films after replacement.
    const cacheKey = new Request(url.href)
    const cache = caches.default
    let full = await cache.match(cacheKey)
    if (!full) {
      const assetUrl = new URL(`/videos/${path}`, url.origin)
      const asset = await env.ASSETS.fetch(new Request(assetUrl, { method: 'GET' }))
      if (!asset.ok || !asset.headers.get('Content-Type')?.includes('video/')) return new Response(null, { status: 404 })
      // Preserve streaming on a cold cache: send the first frame immediately,
      // while the full asset is cached in parallel for later seeking.
      let length = Number(asset.headers.get('Content-Length'))
      let body = asset.body
      if (!length) {
        const bytes = await asset.arrayBuffer()
        length = bytes.byteLength
        body = bytes
      }
      const headers = new Headers({
        'Content-Type': 'video/mp4', 'Content-Length': String(length),
        'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      })
      if (asset.headers.has('ETag')) headers.set('ETag', asset.headers.get('ETag'))
      full = new Response(body, { headers })
      context.waitUntil(cache.put(cacheKey, full.clone()).catch(() => {}))
    }
    const size = Number(full.headers.get('Content-Length'))
    if (request.method === 'HEAD') return new Response(null, { headers: full.headers })
    const rangeHeader = request.headers.get('Range')
    const ifRange = request.headers.get('If-Range')
    if (!rangeHeader || (ifRange && ifRange !== full.headers.get('ETag'))) return full
    const range = parseRange(rangeHeader, size)
    if (!range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } })
    // Cloudflare's cache can serve cached byte ranges without rebuffering.
    const cachedRange = await cache.match(new Request(url.href, { headers: { Range: `bytes=${range.start}-${range.end}` } }))
    if (cachedRange?.status === 206) return cachedRange
    const headers = new Headers(full.headers)
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    headers.set('Content-Length', String(range.end - range.start + 1))
    const body = range.start === 0 && range.end === size - 1 ? full.body : sliceStream(full.body, range.start, range.end)
    return new Response(body, { status: 206, headers })
  },
}
