import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'
import { loadLightPillar } from './effectModules'
import { markBackgroundReady } from './backgroundReadiness'
import BackgroundCompatibility from './BackgroundCompatibility'

const LightPillar = lazy(loadLightPillar)

export default function DeferredLightPillar(props) {
  const ref = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  const ready = useCallback((mode = 'webgl') => markBackgroundReady(ref.current, mode), [])
  const fail = useCallback(() => { if (ref.current) delete ref.current.dataset.backgroundReady; setUnavailable(true) }, [])
  return <div ref={ref} className="deferred-light-pillar ambient-fallback" data-opening-background="pillar" aria-hidden="true">{unavailable
    ? <BackgroundCompatibility kind="pillar" onReady={ready} />
    : <VisualBoundary onError={fail}><Suspense fallback={null}><LightPillar {...props} onReady={ready} onUnavailable={fail} /></Suspense></VisualBoundary>}</div>
}
