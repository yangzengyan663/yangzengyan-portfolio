import { useEffect, useRef } from 'react'

// Keep a moving, theme-matched background on browsers without usable WebGL.
export default function BackgroundCompatibility({ kind, onReady }) {
  const ref = useRef(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (ref.current) onReady?.('compatibility')
    })
    return () => cancelAnimationFrame(frame)
  }, [onReady])
  return <div ref={ref} className={`background-compatibility background-compatibility-${kind}`} aria-hidden="true" />
}
