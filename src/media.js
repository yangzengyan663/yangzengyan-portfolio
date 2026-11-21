// Full films use a byte-range endpoint; gallery motion uses small silent clips.
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

export const playbackUrl = video => video.startsWith('/videos/') ? video.replace('/videos/', '/media/') + '?v=20261112' : video
const githubMediaRoot = 'https://raw.githubusercontent.com/yangzengyan663/yangzengyan-portfolio/main/public'
let preferredProvider
export const playbackCandidates = video => video.startsWith('/videos/')
  ? [playbackUrl(video), `${githubMediaRoot}${video}?v=20261112`]
  : [playbackUrl(video)]
const provider = url => url.startsWith(githubMediaRoot) ? 'github' : 'origin'
export const rememberPlaybackSource = url => { preferredProvider = provider(url) }

// Probe only 4 KB on the first play. Later films reuse the provider that played.
export async function choosePlaybackSources(video, signal) {
  const sources = playbackCandidates(video)
  if (sources.length < 2) return sources
  const first = preferredProvider && sources.find(url => provider(url) === preferredProvider)
  if (first) return [first, ...sources.filter(url => url !== first)]
  const probes = sources.map(() => new AbortController())
  const abort = () => probes.forEach(controller => controller.abort())
  signal.addEventListener('abort', abort, { once: true })
  let timer
  try {
    const winner = await Promise.race([
      Promise.any(sources.map(async (url, index) => {
        const response = await fetch(url, { headers: { Range: 'bytes=0-4095' }, signal: probes[index].signal })
        if (response.status !== 206) { response.body?.cancel().catch(() => {}); throw new Error('Video source unavailable') }
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.length < 8 || String.fromCharCode(...bytes.slice(4, 8)) !== 'ftyp') throw new Error('Invalid video response')
        return url
      })).catch(() => sources[1]),
      new Promise(resolve => { timer = window.setTimeout(() => resolve(sources[1]), 1800) }),
    ])
    return [winner, ...sources.filter(url => url !== winner)]
  } finally {
    clearTimeout(timer)
    abort()
    signal.removeEventListener('abort', abort)
  }
}
export const previewUrl = video => previewNames[video]
  ? `/media-previews/${previewNames[video]}.mp4`
  : video.includes('/digital-human-series/') ? video.replace('/digital-human-series/', '/digital-human-previews/') : undefined
export const previewPoster = video => {
  if (previewNames[video]) return `/media-previews/${previewNames[video]}.jpg`
  const fifi = /\/fifi-gia\/ip-(\d)/.exec(video)
  return fifi ? `/images/fifi-gia-film-${fifi[1]}-cover.webp` : undefined
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
