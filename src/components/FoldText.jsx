import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './FoldText.css'

gsap.registerPlugin(ScrollTrigger)

const hinges = {
  top: { origin: '50% 0%', rotateX: -92, rotateY: 0 },
  bottom: { origin: '50% 100%', rotateX: 92, rotateY: 0 },
  left: { origin: '0% 50%', rotateX: 0, rotateY: 92 },
  right: { origin: '100% 50%', rotateX: 0, rotateY: -92 },
}

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

export default function FoldText({
  text = '',
  splitBy = 'char',
  hinge = 'top',
  duration = .6,
  stagger = .04,
  ease = 'power3.out',
  perspective = 700,
  creaseShading = .55,
  trigger = 'scroll',
  fontSize = 'inherit',
  fontWeight = 'inherit',
  color = 'currentColor',
  className = '',
  style = {},
}) {
  const rootRef = useRef(null)
  const timelineRef = useRef(null)
  const hingeConfig = hinges[hinge] || hinges.top
  const safeCrease = clamp(creaseShading, 0, 1)
  const safePerspective = Math.max(120, perspective)
  const value = String(text ?? '')

  const segments = useMemo(() => {
    const createSegment = (content, key) => <span className="fold-text-segment" key={key} style={{ '--fold-perspective': `${safePerspective}px` }}><span className="fold-text-piece" style={{ transformOrigin: hingeConfig.origin, '--fold-crease': 0 }}>{content || '\u00a0'}</span></span>
    if (splitBy === 'line') return value.split('\n').map((line, index) => <span className="fold-text-line" key={`line-${index}`}>{createSegment(line, `line-piece-${index}`)}</span>)
    if (splitBy === 'word') return value.split(/(\s+)/).map((part, index) => /^\s+$/.test(part) ? <span className="fold-text-whitespace" key={`space-${index}`}>{part.replace(/ /g, '\u00a0')}</span> : part ? createSegment(part, `word-${index}`) : null)
    return Array.from(value).map((character, index) => character === '\n' ? <br key={`break-${index}`} /> : createSegment(character === ' ' ? '\u00a0' : character, `char-${index}`))
  }, [hingeConfig.origin, safePerspective, splitBy, value])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const pieces = Array.from(root.querySelectorAll('.fold-text-piece'))
    if (!pieces.length) return undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = { opacity: 0, rotateX: reducedMotion ? 0 : hingeConfig.rotateX, rotateY: reducedMotion ? 0 : hingeConfig.rotateY, '--fold-crease': reducedMotion ? 0 : safeCrease, transformOrigin: hingeConfig.origin, force3D: true }
    const to = { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0, duration: reducedMotion ? Math.min(duration, .22) : duration, ease: reducedMotion ? 'power1.out' : ease, stagger: reducedMotion ? Math.min(stagger, .02) : stagger, clearProps: 'willChange' }
    const kill = () => { timelineRef.current?.kill(); timelineRef.current = null; gsap.killTweensOf(pieces) }
    const play = () => { kill(); timelineRef.current = gsap.fromTo(pieces, from, to); return timelineRef.current }
    let scrollTrigger
    let hoverHandler
    if (trigger === 'hover') {
      gsap.set(pieces, { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0, transformOrigin: hingeConfig.origin })
      hoverHandler = () => play()
      root.addEventListener('pointerenter', hoverHandler)
    } else if (trigger === 'scroll') {
      gsap.set(pieces, from)
      scrollTrigger = ScrollTrigger.create({ trigger: root, start: 'top 84%', once: true, onEnter: play })
    } else {
      play()
    }
    return () => { root.removeEventListener('pointerenter', hoverHandler); scrollTrigger?.kill(); kill() }
  }, [duration, ease, hingeConfig.origin, hingeConfig.rotateX, hingeConfig.rotateY, safeCrease, stagger, trigger, value])

  return <span ref={rootRef} className={`fold-text ${className}`.trim()} style={{ '--fold-text-font-size': typeof fontSize === 'number' ? `${fontSize}px` : fontSize, '--fold-text-font-weight': fontWeight, '--fold-text-color': color, ...style }}><span className="fold-text-sr-only">{value}</span><span className="fold-text-visual" aria-hidden="true">{segments}</span></span>
}