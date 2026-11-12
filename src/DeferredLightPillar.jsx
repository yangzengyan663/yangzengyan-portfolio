import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const LightPillar = lazy(() => import('./components/LightPillar'))

export default function DeferredLightPillar(props) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoaded(true); observer.disconnect() }
    }, { rootMargin: '240px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{loaded && <Suspense fallback={null}><LightPillar {...props} /></Suspense>}</div>
}
