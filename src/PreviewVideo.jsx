import { useEffect, useRef, useState } from 'react'
import { isPlayerOpen, previewPoster, previewUrl, reducePreviewTraffic } from './media'

export default function PreviewVideo({ src, active = true, rootMargin = '0px', poster, ...props }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [posterReady, setPosterReady] = useState(false)
  const [suspended, setSuspended] = useState(() => document.hidden || isPlayerOpen())
  const [reducedTraffic, setReducedTraffic] = useState(reducePreviewTraffic)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const connection = navigator.connection
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateTraffic = () => setReducedTraffic(reducePreviewTraffic())
    const updateMotion = () => setReducedMotion(motion.matches)
    connection?.addEventListener?.('change', updateTraffic)
    motion.addEventListener?.('change', updateMotion)
    return () => {
      connection?.removeEventListener?.('change', updateTraffic)
      motion.removeEventListener?.('change', updateMotion)
    }
  }, [])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setPosterReady(true); return }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 })
    observer.observe(ref.current)
    const posterObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPosterReady(true); posterObserver.disconnect() }
    }, { rootMargin: rootMargin === '0px' ? '400px' : rootMargin })
    posterObserver.observe(ref.current)
    const update = () => setSuspended(document.hidden || isPlayerOpen())
    document.addEventListener('visibilitychange', update)
    document.addEventListener('portfolio-player-change', update)
    return () => {
      observer.disconnect()
      posterObserver.disconnect()
      document.removeEventListener('visibilitychange', update)
      document.removeEventListener('portfolio-player-change', update)
    }
  }, [rootMargin])

  useEffect(() => {
    const video = ref.current
    const enabled = active && visible && !suspended && !reducedMotion && !reducedTraffic
    const clip = previewUrl(src)
    if (enabled && clip) {
      video.src = clip
      video.play().catch(() => {})
    }
    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load() // Abort an obsolete preview download and release its decoder.
    }
  }, [src, active, visible, suspended, reducedMotion, reducedTraffic])

  return <video ref={ref} poster={posterReady ? poster || previewPoster(src) : undefined} muted loop playsInline preload="none" {...props} />
}
