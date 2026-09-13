import { useEffect, useRef, useState } from 'react'
import './CircularGallery.css'

const wrapDistance = (value, total) => { const half = total / 2; return ((value + half) % total + total) % total - half }

export default function CircularGallery({ items = [], bend = 3, textColor = '#ffffff', borderRadius = 0.1, scrollEase = 0.09, font = 'bold 30px Orbitron', scrollSpeed = 1.3, onItemClick }) {
  const rootRef = useRef(null)
  const itemRefs = useRef([])
  const targetRef = useRef(0)
  const currentRef = useRef(0)
  const pointerRef = useRef(null)
  const didDragRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: '320px 0px', threshold: .04 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    itemRefs.current.forEach(element => {
      const video = element?.querySelector('video')
      if (!video) return
      if (isVisible) {
        video.muted = true
        video.preload = 'auto'
        if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load()
      } else {
        video.pause()
      }
    })
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return undefined
    let frameId = 0
    const render = () => {
      const current = currentRef.current + (targetRef.current - currentRef.current) * scrollEase
      currentRef.current = Math.abs(targetRef.current - current) < .001 ? targetRef.current : current
      const total = items.length || 1
      itemRefs.current.forEach((element, index) => {
        if (!element) return
        const distance = wrapDistance(index - currentRef.current, total)
        const absoluteDistance = Math.abs(distance)
        const x = distance * 292
        const z = -absoluteDistance * 108 * bend
        const rotation = -distance * 18
        const scale = Math.max(.66, 1 - absoluteDistance * .12)
        const opacity = Math.max(.22, 1 - absoluteDistance * .18)
        element.style.transform = `translate3d(calc(-50% + ${x}px), -50%, ${z}px) rotateY(${rotation}deg) scale(${scale})`
        element.style.opacity = String(opacity)
        element.style.zIndex = String(50 - Math.round(absoluteDistance * 10))
      })
      const nextActive = ((Math.round(currentRef.current) % total) + total) % total
      setActiveIndex(previous => previous === nextActive ? previous : nextActive)
      frameId = window.requestAnimationFrame(render)
    }
    frameId = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(frameId)
  }, [bend, isVisible, items.length, scrollEase])

  useEffect(() => {
    const cleanups = []
    itemRefs.current.forEach((element, index) => {
      const video = element?.querySelector('video')
      if (!video) return
      const start = () => video.play().catch(() => {})
      if (isVisible && index === activeIndex) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start()
        else {
          video.addEventListener('loadeddata', start, { once: true })
          cleanups.push(() => video.removeEventListener('loadeddata', start))
          video.load()
        }
      } else {
        video.pause()
      }
    })
    return () => cleanups.forEach(cleanup => cleanup())
  }, [activeIndex, isVisible])

  const move = amount => { targetRef.current += amount * scrollSpeed }
  const handleWheel = event => { if (!isVisible) return; event.preventDefault(); move(event.deltaY > 0 ? .42 : -.42) }
  const handlePointerDown = event => { pointerRef.current = { x: event.clientX, value: targetRef.current }; didDragRef.current = false; event.currentTarget.setPointerCapture?.(event.pointerId) }
  const handlePointerMove = event => { if (!pointerRef.current) return; const distance = event.clientX - pointerRef.current.x; if (Math.abs(distance) > 6) didDragRef.current = true; targetRef.current = pointerRef.current.value - distance / 210 }
  const handlePointerUp = () => { pointerRef.current = null }
  const openItem = (event, item) => { event.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return }; onItemClick?.(item) }

  return <div ref={rootRef} className="circular-gallery" style={{ '--circular-text': textColor, '--circular-radius': `${borderRadius}rem`, '--circular-font': font }} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
    <div className="circular-gallery-halo" /><div className="circular-gallery-track">
      {items.map((item, index) => <button ref={element => { itemRefs.current[index] = element }} className={`circular-gallery-card ${activeIndex === index ? 'is-active' : ''}`} type="button" key={item.video} onPointerDown={event => event.stopPropagation()} onClick={event => openItem(event, item)} aria-label={`Open ${item.label} full video`}><video src={item.video} muted loop playsInline preload={isVisible ? 'auto' : 'none'} /><span className="circular-gallery-shade" /><span className="circular-gallery-card-info"><small>FIFI_GIA / 0{index + 1}</small><strong>{item.label}</strong><i>VIEW FILM &rarr;</i></span></button>)}
    </div><div className="circular-gallery-counter"><span>0{activeIndex + 1}</span><i /> <span>0{items.length}</span></div><button className="circular-gallery-open" type="button" onClick={event => openItem(event, items[activeIndex])} aria-label={`Open ${items[activeIndex]?.label || 'active'} full video`}>OPEN FULL VIDEO <span>&nearr;</span></button><p className="circular-gallery-hint">SCROLL OR DRAG TO EXPLORE</p>
  </div>
}
