const eventName = 'portfolio-background-ready'

export function markBackgroundReady(element, mode = 'webgl') {
  if (!element || element.dataset.backgroundReady === mode) return
  element.dataset.backgroundReady = mode
  document.dispatchEvent(new Event(eventName))
}

export function waitForBackgrounds() {
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
