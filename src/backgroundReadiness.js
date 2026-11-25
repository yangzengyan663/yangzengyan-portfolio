const eventName = 'portfolio-background-ready'

function reportBackgrounds() {
  const backgrounds = [...document.querySelectorAll('[data-opening-background]')]
  const ready = backgrounds.filter(element => ['webgl', 'compatibility'].includes(element.dataset.backgroundReady)).length
  globalThis.window?.__portfolioOpening?.reportBackgrounds?.(ready, backgrounds.length)
}

export function markBackgroundReady(element, mode = 'webgl') {
  if (!element || element.dataset.backgroundReady === mode) return
  element.dataset.backgroundReady = mode
  reportBackgrounds()
  document.dispatchEvent(new Event(eventName))
}

export function waitForBackgrounds() {
  reportBackgrounds()
  const backgrounds = [...document.querySelectorAll('[data-opening-background]')]
  if (!backgrounds.length) return Promise.reject(new Error('Portfolio backgrounds are not mounted'))
  const ready = () => backgrounds.every(element => ['webgl', 'compatibility'].includes(element.dataset.backgroundReady))
  if (ready()) return Promise.resolve()
  return new Promise(resolve => {
    const changed = () => {
      if (!ready()) return
      document.removeEventListener(eventName, changed)
      resolve()
    }
    document.addEventListener(eventName, changed)
    changed()
  })
}
