import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'

const LightPillar = lazy(() => import('./components/LightPillar'))

export default function DeferredLightPillar(props) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches || navigator.connection?.saveData) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoaded(true); observer.disconnect() }
    }, { rootMargin: '240px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="deferred-light-pillar ambient-fallback" aria-hidden="true">{loaded && <VisualBoundary><Suspense fallback={null}><LightPillar {...props} /></Suspense></VisualBoundary>}</div>
}
