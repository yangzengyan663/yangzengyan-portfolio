import { prepareImage, preparedImageSource } from './preparedImages'
import { effectPreparationTasks } from './effectModules'
import { waitForBackgrounds } from './backgroundReadiness'

const displayImages = () => [...document.querySelectorAll('#root img[data-media-src]')]
const paint = () => new Promise(resolve => requestAnimationFrame(resolve))

export function openingPreparation() {
  const images = displayImages()
  const sources = [...new Set(images.map(image => image.dataset.mediaSrc).filter(Boolean))]
  if (!sources.length) throw new Error('Portfolio images are not mounted')
  return {
    tasks: [
      ...sources.map(source => ({ id: `image:${source}`, run: () => prepareImage(source) })),
      ...effectPreparationTasks(),
    ],
    async finalize() {
      // Opening is complete only with real clear covers and rendered backgrounds.
      await paint()
      await paint()
      await Promise.all(displayImages().map(async image => {
        const source = image.dataset.mediaSrc
        const displayed = preparedImageSource(source)
        if (!displayed) throw new Error('An opening image is not ready')
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
      await waitForBackgrounds()
      await paint()
    },
  }
}
