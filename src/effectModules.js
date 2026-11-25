import { useSyncExternalStore } from 'react'
import './components/LightPillar.css'
import './components/FoldText.css'

// Small effect styles join the inline shell; all optional effect code shares
// one lazy request instead of three JS requests and their extra stylesheets.
const loadBundle = () => import('./effectsBundle')
export const loadWebThreads = () => loadBundle().then(bundle => ({ default: bundle.WebThreads }))
export const loadLightPillar = () => loadBundle().then(bundle => ({ default: bundle.LightPillar }))
export const loadProfileText = () => loadBundle().then(bundle => ({ default: bundle.ProfileTextEffects }))

export function effectPreparationTasks() {
  return [{ id: 'effects', run: loadBundle }]
}

const subscribe = notify => {
  document.addEventListener('portfolio-opening-finished', notify)
  return () => document.removeEventListener('portfolio-opening-finished', notify)
}
const snapshot = () => !window.__portfolioOpening || window.__portfolioOpening.isFinished()
export const useOpeningFinished = () => useSyncExternalStore(subscribe, snapshot, () => false)
