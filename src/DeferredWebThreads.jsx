import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'
import './components/WebThreads.css'
import { loadWebThreads } from './effectModules'
import { markBackgroundReady } from './backgroundReadiness'
import BackgroundCompatibility from './BackgroundCompatibility'

const WebThreads = lazy(loadWebThreads)

export default function DeferredWebThreads(props) {
  const ref = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  const ready = useCallback((mode = 'webgl') => markBackgroundReady(ref.current, mode), [])
  const fail = useCallback(() => { if (ref.current) delete ref.current.dataset.backgroundReady; setUnavailable(true) }, [])
  return <div ref={ref} className="web-threads-container ambient-fallback" data-opening-background="threads" aria-hidden="true">{unavailable
    ? <BackgroundCompatibility kind="threads" onReady={ready} />
    : <VisualBoundary onError={fail}><Suspense fallback={null}><WebThreads {...props} onReady={ready} onUnavailable={fail} /></Suspense></VisualBoundary>}</div>
}
