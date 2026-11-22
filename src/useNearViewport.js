import { useEffect, useState } from 'react'

const observerPools = new Map()

// Share observers across the many repeated covers in the animated galleries.
function watch(element, rootMargin, callback) {
  let pool = observerPools.get(rootMargin)
  if (!pool) {
    pool = { targets: new Map() }
    pool.observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) [...(pool.targets.get(entry.target) || [])].forEach(notify => notify())
      }
    }, { rootMargin, threshold: 0 })
    observerPools.set(rootMargin, pool)
  }
  let callbacks = pool.targets.get(element)
  if (!callbacks) {
    callbacks = new Set()
    pool.targets.set(element, callbacks)
    pool.observer.observe(element)
  }
  callbacks.add(callback)
  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    callbacks.delete(callback)
    if (callbacks.size) return
    pool.observer.unobserve(element)
    pool.targets.delete(element)
    if (!pool.targets.size) {
      pool.observer.disconnect()
      if (observerPools.get(rootMargin) === pool) observerPools.delete(rootMargin)
    }
  }
}

export function observeNearViewport(element, onNear, { rootMargin = '800px 0px', sectionRootMargin = rootMargin } = {}) {
  if (!element) return () => {}
  let stopped = false
  let stopSection = () => {}
  let stopImage = () => {}
  const stop = () => {
    if (stopped) return
    stopped = true
    stopSection()
    stopImage()
  }
  const reveal = () => {
    if (stopped) return
    stop()
    onNear()
  }
  const section = element.closest('section')

  if (typeof window.IntersectionObserver !== 'function') {
    // Retain visible covers on older browsers; films remain click-only.
    reveal()
    return stop
  }

  const watchImage = () => { if (!stopped) stopImage = watch(element, rootMargin, reveal) }
  if (section && section !== element) {
    stopSection = watch(section, sectionRootMargin, () => { stopSection(); watchImage() })
  } else watchImage()
  return stop
}

export default function useNearViewport(ref, { rootMargin = '800px 0px', sectionRootMargin = rootMargin, enabled = true } = {}) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (!enabled) { setNear(true); return }
    if (near) return
    return observeNearViewport(ref.current, () => setNear(true), { rootMargin, sectionRootMargin })
  }, [ref, near, rootMargin, sectionRootMargin, enabled])
  return !enabled || near
}
