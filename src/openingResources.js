import { prepareImage, preparedImageSource } from './preparedImages'
import { placeholderFor } from './posterPlaceholders'

const displayImages = () => [...document.querySelectorAll('#root img[data-media-src]')]
const paint = () => new Promise(resolve => requestAnimationFrame(resolve))

export function openingPreparation() {
  const images = displayImages()
  const critical = images.filter(image => image.closest('#home') || image.dataset.mediaSrc === '/mark.svg')
  const sources = [...new Set(critical.map(image => image.dataset.mediaSrc).filter(Boolean))]
  if (!sources.length) throw new Error('Portfolio images are not mounted')
  return {
    tasks: [
      ...sources.map(source => ({ id: `image:${source}`, run: () => prepareImage(source) })),
    ],
    async finalize() {
      // The home is sharp; every other work already has its real inline frame.
      // Below-the-fold high-resolution packs and effects can load while browsing.
      await paint()
      await paint()
      await Promise.all(displayImages().map(async image => {
        const source = image.dataset.mediaSrc
        const displayed = preparedImageSource(source) || placeholderFor(source)
        if (!displayed || (critical.includes(image) && !preparedImageSource(source))) throw new Error('An opening image is not ready')
        const expected = new URL(displayed, document.baseURI).href
        if (new URL(image.getAttribute('src'), document.baseURI).href !== expected) throw new Error('A gallery image still shows a placeholder')
        if (typeof image.decode === 'function') await image.decode()
        else if (!image.complete) await new Promise((resolve, reject) => {
          const done = () => { image.removeEventListener('error', broken); resolve() }
          const broken = () => { image.removeEventListener('load', done); reject(new Error('A gallery image did not load')) }
          image.addEventListener('load', done, { once: true })
          image.addEventListener('error', broken, { once: true })
        })
        if (image.currentSrc !== expected || !image.complete || image.naturalWidth === 0) throw new Error('A gallery image is not decoded')
      }))
      if (document.fonts) {
        await document.fonts.ready
        if ([...document.fonts].some(face => face.status === 'error')) throw new Error('A display font did not load')
      }
      await paint()
    },
  }
}
