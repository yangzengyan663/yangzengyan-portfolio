// Only /media/* invokes this worker. All pages and previews remain static assets.
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { start, end } : null
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
      // ASSETS is colocated with the worker. Buffer at the edge, never wait for
      // a complete download on the visitor's device before starting playback.
      const bytes = await asset.arrayBuffer()
      const headers = new Headers({
        'Content-Type': 'video/mp4', 'Content-Length': String(bytes.byteLength),
        'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      })
      if (asset.headers.has('ETag')) headers.set('ETag', asset.headers.get('ETag'))
      full = new Response(bytes, { headers })
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
    const bytes = await full.arrayBuffer()
    const headers = new Headers(full.headers)
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    headers.set('Content-Length', String(range.end - range.start + 1))
    return new Response(bytes.slice(range.start, range.end + 1), { status: 206, headers })
  },
}
