import { useCallback, useEffect, useRef, useState } from 'react'
import './AccordionGallery.css'

const resolveEase = ease => ease?.includes('power3') ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.22,1,.36,1)'

export default function AccordionGallery({
  items = [], defaultIndex = 0, expandRatio = .52, trigger = 'hover', accentColor = '#ffffff', overlayColor = '#060010', textColor = '#ffffff', grayscale = false, showLabels = true, duration = .6, ease = 'power3.out', parallax = .5, tilt = 8, stagger = .06, height = 460, gap = 10, radius = 16, orientation = 'horizontal', onItemClick,
}) {
  const rootRef = useRef(null)
  const videoRefs = useRef([])
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(items.length - 1, 0)))
  const expandedFlex = Math.max(3.5, expandRatio * 10)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: '160px 0px', threshold: .05 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const cleanups = []
    videoRefs.current.forEach(video => {
      if (!video) return
      const start = () => video.play().catch(() => {})
      if (isVisible) {
        video.muted = true
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
  }, [isVisible])

  const activate = index => setActiveIndex(index)
  const moveMedia = useCallback((event, index) => {
    if (index !== activeIndex) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const media = event.currentTarget.querySelector('video, img')
    if (!media) return
    const offsetX = ((event.clientX - bounds.left) / bounds.width - .5) * parallax * 12
    const offsetY = ((event.clientY - bounds.top) / bounds.height - .5) * parallax * 12
    media.style.transform = `scale(1.09) translate(${offsetX}px, ${offsetY}px)`
  }, [activeIndex, parallax])
  const resetMedia = event => { const media = event.currentTarget.querySelector('video, img'); if (media) media.style.transform = '' }

  return <div ref={rootRef} className={`accordion-gallery accordion-gallery-${orientation}`} style={{ '--accordion-duration': `${duration}s`, '--accordion-ease': resolveEase(ease), '--accordion-accent': accentColor, '--accordion-overlay': overlayColor, '--accordion-text': textColor, '--accordion-gap': `${gap}px`, '--accordion-radius': `${radius}px`, '--accordion-height': `${height}px`, '--accordion-tilt': `${tilt}deg`, '--accordion-negative-tilt': `${-tilt}deg`, '--accordion-grayscale': grayscale ? 1 : 0, '--accordion-active-grayscale': grayscale ? .06 : 0 }}>
    {items.map((item, index) => {
      const isActive = index === activeIndex
      const events = trigger === 'hover' ? { onMouseEnter: () => activate(index), onFocus: () => activate(index) } : {}
      return <a className={`accordion-gallery-item ${isActive ? 'is-active' : ''}`} href={item.link || '#'} key={item.video || item.image || item.label || index} style={{ flexGrow: isActive ? expandedFlex : 1, transitionDelay: `${index * stagger}s` }} {...events} onClick={event => { event.preventDefault(); activate(index); onItemClick?.(item, index) }} onPointerMove={event => moveMedia(event, index)} onPointerLeave={resetMedia} aria-label={item.label || `Project ${index + 1}`}>
        {item.video ? <video ref={element => { videoRefs.current[index] = element }} src={item.video} autoPlay muted loop playsInline preload={isVisible ? 'metadata' : 'none'} /> : <img src={item.image} alt="" loading="lazy" />}
        <span className="accordion-gallery-overlay" />
        {showLabels && <span className="accordion-gallery-label"><small>SHORT DRAMA / {String(index + 1).padStart(2, '0')}</small><strong>{item.label}</strong><i>&rarr;</i></span>}
      </a>
    })}
  </div>
}
