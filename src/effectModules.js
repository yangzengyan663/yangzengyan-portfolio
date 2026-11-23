// Share the exact imports between opening preparation and the deferred effects.
export const loadWebThreads = () => import('./components/WebThreads')
export const loadLightPillar = () => import('./components/LightPillar')
export const loadProfileText = () => import('./ProfileTextEffects')

export function effectPreparationTasks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches || navigator.connection?.saveData) return []
  const tasks = [{ id: 'threads', run: loadWebThreads }]
  if ('IntersectionObserver' in window) tasks.push({ id: 'pillar', run: loadLightPillar }, { id: 'text', run: loadProfileText })
  return tasks
}
import { useSyncExternalStore } from 'react'

const subscribe = notify => {
  document.addEventListener('portfolio-opening-finished', notify)
  return () => document.removeEventListener('portfolio-opening-finished', notify)
}
const snapshot = () => !window.__portfolioOpening || window.__portfolioOpening.isFinished()
export const useOpeningFinished = () => useSyncExternalStore(subscribe, snapshot, () => false)

