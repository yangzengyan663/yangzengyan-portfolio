import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './StrokeText.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum)

export default function StrokeText({
  text,
  strokeColor = '#c99bff',
  fillColor = '#f8f4ff',
  strokeWidth = 1.4,
  drawDuration = 1.35,
  fillDelay = .08,
  stagger = .05,
  ease = 'power2.out',
  trigger = 'scroll',
  fillMode = 'wipe',
  fontSize = 160,
  fontWeight = 700,
  letterSpacing = -8,
  reverse = false,
  className = '',
  style = {},
}) {
  const rootRef = useRef(null)
  const textRef = useRef(null)
  const wipeRectRef = useRef(null)
  const [box, setBox] = useState(null)
  const rawId = useId()
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const characters = useMemo(() => Array.from(String(text ?? '')), [text])
  const dash = Math.max(fontSize * 7, 200)
  const fontStyle = useMemo(() => ({ fontSize: `${fontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` }), [fontSize, fontWeight, letterSpacing])

  useLayoutEffect(() => {
    const measure = () => {
      const node = textRef.current
      if (!node) return
      try {
        const bounds = node.getBBox()
        if (!bounds.width) return
        const padding = Math.max(Number(strokeWidth) || 1, fontSize * .1)
        setBox({ x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 })
      } catch {}
    }
    measure()
    document.fonts?.ready?.then(measure).catch(() => {})
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !box) return undefined
    const strokes = gsap.utils.toArray(root.querySelectorAll('[data-stroke-char]'))
    const fills = gsap.utils.toArray(root.querySelectorAll('[data-fill-char]'))
    const wipe = wipeRectRef.current
    const targets = [...strokes, ...fills, wipe].filter(Boolean)
    const fillEnabled = fillMode !== 'none'
    const useWipe = fillEnabled && fillMode === 'wipe'
    const staggerConfig = reverse ? { each: stagger, from: 'end' } : stagger
    const setStart = () => {
      gsap.killTweensOf(targets)
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash })
      gsap.set(fills, { opacity: useWipe ? 1 : 0 })
      if (wipe) gsap.set(wipe, { attr: { width: 0 } })
    }
    const setEnd = () => {
      gsap.killTweensOf(targets)
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 })
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 })
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEnd()
      return () => gsap.killTweensOf(targets)
    }
    const timeline = gsap.timeline({ paused: true, defaults: { overwrite: 'auto' } })
    setStart()
    timeline.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig }, 0)
    if (useWipe && wipe) {
      timeline.to(wipe, { attr: { width: box.width }, duration: Math.max(.4, drawDuration * .52), ease: 'power2.inOut' }, drawDuration + fillDelay)
    } else if (fillEnabled) {
      timeline.to(fills, { opacity: 1, duration: Math.max(.4, drawDuration * .52), ease: 'power2.out', stagger: staggerConfig }, drawDuration + fillDelay)
    }
    let scrollTrigger
    const play = () => { timeline.restart() }
    if (trigger === 'hover') {
      setEnd()
      root.addEventListener('pointerenter', play)
    } else if (trigger === 'scroll') {
      scrollTrigger = ScrollTrigger.create({ trigger: root, start: 'top 84%', once: true, onEnter: () => timeline.play(0) })
    } else {
      timeline.play(0)
    }
    return () => {
      root.removeEventListener('pointerenter', play)
      scrollTrigger?.kill()
      timeline.kill()
      gsap.killTweensOf(targets)
    }
  }, [box, dash, drawDuration, ease, fillDelay, fillMode, reverse, stagger, trigger])

  const viewBox = box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-fontSize} ${fontSize * 4} ${fontSize * 1.35}`
  return <span ref={rootRef} className={`stroke-text ${className}`.trim()} style={{ ...style, '--stroke-text-height': `${Math.round(fontSize * 1.28)}px` }} role="img" aria-label={text}>
    <svg className="stroke-text__svg" viewBox={viewBox} preserveAspectRatio="xMinYMid meet" aria-hidden="true">
      {fillMode === 'wipe' && box && <defs><clipPath id={wipeId} clipPathUnits="userSpaceOnUse"><rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} /></clipPath></defs>}
      <text ref={textRef} className="stroke-text__stroke" x="0" y="0" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle}>{characters.map((character, index) => <tspan data-stroke-char key={`stroke-${index}`}>{character}</tspan>)}</text>
      <text className="stroke-text__fill" x="0" y="0" fill={fillColor} stroke="none" style={fontStyle} clipPath={fillMode === 'wipe' && box ? `url(#${wipeId})` : undefined}>{characters.map((character, index) => <tspan data-fill-char key={`fill-${index}`}>{character}</tspan>)}</text>
    </svg>
  </span>
}