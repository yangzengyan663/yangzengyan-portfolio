import { useEffect, useRef, useState } from 'react'
import { isPlayerOpen, previewPoster, previewUrl } from './media'

export default function PreviewVideo({ src, active = true, rootMargin = '0px', poster, ...props }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [suspended, setSuspended] = useState(() => document.hidden || isPlayerOpen())

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin, threshold: .1 })
    observer.observe(ref.current)
    const update = () => setSuspended(document.hidden || isPlayerOpen())
    document.addEventListener('visibilitychange', update)
    document.addEventListener('portfolio-player-change', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      document.removeEventListener('portfolio-player-change', update)
    }
  }, [rootMargin])

  useEffect(() => {
    const video = ref.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const enabled = active && visible && !suspended && !reducedMotion && !navigator.connection?.saveData
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
  }, [src, active, visible, suspended])

  return <video ref={ref} poster={poster || previewPoster(src)} muted loop playsInline preload="none" {...props} />
}
