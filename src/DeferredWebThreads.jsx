import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'
import './components/WebThreads.css'

const WebThreads = lazy(() => import('./components/WebThreads'))

export default function DeferredWebThreads(props) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches || navigator.connection?.saveData) return
    // Let the first screen and its controls paint before compiling a shader.
    const timer = window.setTimeout(() => {
      const bounds = ref.current?.getBoundingClientRect()
      if (bounds?.bottom > 0 && bounds.top < innerHeight) setLoaded(true)
    }, 1600)
    return () => clearTimeout(timer)
  }, [])
  return <div ref={ref} className="web-threads-container ambient-fallback" aria-hidden="true">{loaded && <VisualBoundary><Suspense fallback={null}><WebThreads {...props} /></Suspense></VisualBoundary>}</div>
}
