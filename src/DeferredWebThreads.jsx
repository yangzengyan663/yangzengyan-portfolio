import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'
import './components/WebThreads.css'
import { loadWebThreads, useOpeningFinished } from './effectModules'

const WebThreads = lazy(loadWebThreads)

export default function DeferredWebThreads(props) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const openingFinished = useOpeningFinished()
  useEffect(() => {
    if (!openingFinished) return
    if (window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches || navigator.connection?.saveData) return
    const bounds = ref.current?.getBoundingClientRect()
    if (bounds?.bottom > 0 && bounds.top < innerHeight) setLoaded(true)
  }, [openingFinished])
  return <div ref={ref} className="web-threads-container ambient-fallback" aria-hidden="true">{loaded && <VisualBoundary><Suspense fallback={null}><WebThreads {...props} /></Suspense></VisualBoundary>}</div>
}
