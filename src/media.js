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
