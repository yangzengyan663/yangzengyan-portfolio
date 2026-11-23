import { assetUrl, staticMirror } from './assetPaths.js'

// Full films are requested only after a visitor opens the player.
const previewNames = {
  '/videos/cup-people/1.mp4': 'cup-1',
  '/videos/cup-people/2.mp4': 'cup-2',
  '/videos/cup-people/3.mp4': 'cup-3',
  '/videos/cup-people/4.mp4': 'cup-4',
  '/videos/cup-people/cup-person-part-1.mp4': 'cup-special',
  '/videos/chinese-culture/jinshan.mp4': 'jinshan',
  '/videos/chinese-culture/new-li-bai.mp4': 'ancient-shu',
  '/videos/advertising-series/seagames-01.mp4': 'seagames-1',
  '/videos/advertising-series/seagames-02.mp4': 'seagames-2',
  '/videos/jiangxing-laptop/jiangxing-laptop-ad.mp4': 'jiangxing',
}

export const playbackUrl = video => video.startsWith('/videos/')
  ? (staticMirror ? assetUrl(video) : video.replace('/videos/', '/media/')) + '?v=20261112'
  : video
const githubMediaRoot = 'https://raw.githubusercontent.com/yangzengyan663/yangzengyan-portfolio/main/public'
let preferredProvider
const failedProviders = new Map()
const preferenceLifetime = 2 * 60 * 1000
const failureCooldown = 30 * 1000
export const playbackCandidates = video => video.startsWith('/videos/')
  ? [playbackUrl(video), `${githubMediaRoot}${video}?v=20261112`, ...(staticMirror ? [`https://yangzengyan-portfolio.pages.dev${video.replace('/videos/', '/media/')}?v=20261112`] : [])]
  : [playbackUrl(video)]
const provider = url => url.startsWith(githubMediaRoot) ? 'github' : url.startsWith('https://yangzengyan-portfolio.pages.dev') ? 'cloudflare' : 'origin'
export const rememberPlaybackSource = url => {
  const name = provider(url)
  preferredProvider = { name, until: Date.now() + preferenceLifetime }
  failedProviders.delete(name)
}
export const forgetPlaybackSource = url => {
  const name = provider(url)
  if (preferredProvider?.name === name) preferredProvider = undefined
  failedProviders.set(name, Date.now() + failureCooldown)
}
export function orderedPlaybackSources(video) {
  const sources = playbackCandidates(video)
  const now = Date.now()
  if (preferredProvider?.until <= now) preferredProvider = undefined
  return sources.sort((a, b) => {
    const priority = url => failedProviders.get(provider(url)) > now ? 2 : preferredProvider?.name === provider(url) ? 0 : 1
    return priority(a) - priority(b)
  })
}

// This runs alongside native playback, never before assigning the video's src.
// Only probe 4 KB; abort all work once a film starts or the player closes.
export async function choosePlaybackSources(video, signal) {
  signal.throwIfAborted()
  const sources = orderedPlaybackSources(video)
  if (sources.length < 2) return sources
  if (preferredProvider?.name === provider(sources[0])) return sources
  const probes = sources.map(() => new AbortController())
  const stopProbes = () => probes.forEach(controller => controller.abort())
  let onAbort
  let timer
  try {
    const winner = await Promise.race([
      Promise.any(sources.map(async (url, index) => {
        const response = await fetch(url, { headers: { Range: 'bytes=0-4095' }, signal: probes[index].signal })
        if (response.status !== 206) { response.body?.cancel().catch(() => {}); throw new Error('Video source unavailable') }
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.length < 8 || String.fromCharCode(...bytes.slice(4, 8)) !== 'ftyp') throw new Error('Invalid video response')
        return url
      })).catch(() => sources[0]),
      new Promise(resolve => { timer = globalThis.setTimeout(() => resolve(sources[0]), 1800) }),
      new Promise((_, reject) => {
        onAbort = () => { stopProbes(); reject(signal.reason || new DOMException('Playback selection aborted', 'AbortError')) }
        signal.addEventListener('abort', onAbort, { once: true })
      }),
    ])
    signal.throwIfAborted()
    return [winner, ...sources.filter(url => url !== winner)]
  } finally {
    clearTimeout(timer)
    stopProbes()
    signal.removeEventListener('abort', onAbort)
  }
}

export const reducePreviewTraffic = () => {
  const connection = navigator.connection
  return document.documentElement.dataset.connectionMode === 'lite'
    || Boolean(connection?.saveData)
    || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType)
}
export const previewUrl = video => previewNames[video]
  ? `/media-previews/${previewNames[video]}.mp4`
  : video.includes('/digital-human-series/') ? video.replace('/digital-human-series/', '/digital-human-previews/') : undefined
export const previewPoster = video => {
  if (previewNames[video]) return `/media-previews/${previewNames[video]}.jpg`
  const music = /^\/videos\/digital-human-series\/([^/]+)\.mp4$/.exec(video)
  if (music) return `/media-previews/mv-${music[1]}.webp`
  const fifi = /\/fifi-gia\/ip-(\d)/.exec(video)
  if (fifi) return `/images/fifi-gia-film-${fifi[1]}-cover.webp`
  const advertising = /^\/videos\/advertising-series\/ad-(\d)\.mp4$/.exec(video)
  return advertising ? `/images/advertising-series/ad-${advertising[1]}-cover.webp` : undefined
}

let playerOpen = false
export const isPlayerOpen = () => playerOpen
export function setPlayerOpen(open) {
  playerOpen = open
  document.dispatchEvent(new Event('portfolio-player-change'))
  document.documentElement.classList.toggle('video-player-open', open)
}

const thumbnails = {
  "/images/digital-human-series/luna.jpg": "/media-previews/mv-luna.webp",
  "/images/digital-human-series/marcus-saint-01.png": "/media-previews/mv-marcus-saint-01.webp",
  "/images/digital-human-series/marcus-saint-02.png": "/media-previews/mv-marcus-saint-02.webp",
  "/images/digital-human-series/marcus-saint-03.png": "/media-previews/mv-marcus-saint-03.webp",
  "/images/digital-human-series/milo.png": "/media-previews/mv-milo.webp",
  "/images/digital-human-series/olila.png": "/media-previews/mv-olila.webp",
  "/images/digital-human-series/seraphina.jpg": "/media-previews/mv-seraphina.webp",
  "/images/digital-human-series/soren.jpg": "/media-previews/mv-soren.webp",
  "/images/digital-human-series/tjax-02.png": "/media-previews/mv-tjax-02.webp",
  "/images/digital-human-series/tjax.png": "/media-previews/mv-tjax.webp",
  "/images/chinese-culture/jinshan-promo-01.jpg": "/media-previews/jinshan-promo-01.webp",
  "/images/chinese-culture/jinshan-promo-02.jpg": "/media-previews/jinshan-promo-02.webp",
  "/images/chinese-culture/ancient-shu-01.png": "/media-previews/ancient-shu-01.webp",
  "/images/chinese-culture/ancient-shu-02.png": "/media-previews/ancient-shu-02.webp",
  "/images/advertising-series/seagames-01.png": "/media-previews/seagames-01.webp",
  "/images/advertising-series/seagames-02.png": "/media-previews/seagames-02.webp",
  "/images/jiangxing-laptop/jiangxing-laptop-poster.png": "/media-previews/jiangxing-laptop-poster.webp"
}
export const thumbnailUrl = image => thumbnails[image] || image
