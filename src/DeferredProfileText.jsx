import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import VisualBoundary from './VisualBoundary'
import './components/StrokeText.css'

const ProfileTextEffects = lazy(() => import('./ProfileTextEffects'))

function StaticStroke({ text, className = '', fontSize = 160, fontWeight = 700, letterSpacing = -8, fillColor = '#f8f4ff', strokeColor = '#c99bff', strokeWidth = 1.4, style }) {
  return <span className={`stroke-text ${className}`} style={{ '--stroke-text-height': `${fontSize * 1.28}px`, ...style }} role="img" aria-label={text}>
    <svg className="stroke-text__svg" viewBox={`0 ${-fontSize} ${fontSize * Array.from(text).length} ${fontSize * 1.28}`} preserveAspectRatio="xMinYMid meet" aria-hidden="true">
      <text x="0" y="0" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} style={{ fontSize, fontWeight, letterSpacing }}>{text}</text>
    </svg>
  </span>
}

function DeferredText({ kind, ...props }) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const fallback = kind === 'stroke' ? <StaticStroke {...props} /> : <span className={props.className} style={props.style}>{props.text}</span>
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches || navigator.connection?.saveData) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoaded(true); observer.disconnect() }
    }, { threshold: .01 })
    observer.observe(ref.current.closest('#about') || ref.current)
    return () => observer.disconnect()
  }, [])
  return <span ref={ref} className="deferred-profile-text" style={{ display: 'contents' }}>{loaded ? <VisualBoundary fallback={fallback}><Suspense fallback={fallback}><ProfileTextEffects kind={kind} {...props} /></Suspense></VisualBoundary> : fallback}</span>
}

export const StrokeText = props => <DeferredText kind="stroke" {...props} />
export const FoldText = props => <DeferredText kind="fold" {...props} />
