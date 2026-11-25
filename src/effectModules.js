import { useSyncExternalStore } from 'react'
import './components/LightPillar.css'
import './components/FoldText.css'
import * as bundle from './effectsBundle'

// Both original backgrounds are required before entry. Include their compact
// implementation in the shell so a second slow JS request cannot hold 100%.
const loadBundle = () => Promise.resolve(bundle)
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
