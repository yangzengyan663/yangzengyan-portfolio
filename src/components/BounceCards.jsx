import { useEffect, useRef, useState } from 'react'
import './BounceCards.css'

export default function BounceCards({ className = '', items = [], containerWidth = 500, containerHeight = 250, animationDelay = 1, animationStagger = 0.08, transformStyles = [], enableHover = false, onItemClick }) {
  const rootRef = useRef(null)
  const videoRefs = useRef([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: .08 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    videoRefs.current.forEach(video => {
      if (!video) return
      if (isVisible) video.play().catch(() => {})
      else video.pause()
    })
  }, [isVisible])

  return <div ref={rootRef} className={`bounce-cards ${className}`} style={{ '--bounce-width': `${containerWidth}px`, '--bounce-height': `${containerHeight}px`, '--bounce-delay': `${animationDelay}s`, '--bounce-stagger': `${animationStagger}s` }}>
    {items.map((item, index) => <button className={`bounce-card ${enableHover ? 'bounce-card-hoverable' : ''}`} style={{ '--bounce-transform': transformStyles[index] || 'rotate(0deg)', '--bounce-index': index }} type="button" key={item.video} onClick={() => onItemClick?.(item)} aria-label={`Open ${item.label}`}>
      <video ref={element => { videoRefs.current[index] = element }} src={item.video} muted loop playsInline preload={isVisible ? 'metadata' : 'none'} />
      <span className="bounce-card-shade" />
      <span className="bounce-card-info"><small>ADVERTISING FILM / 0{index + 1}</small><strong>{item.label}</strong><i>VIEW FILM &rarr;</i></span>
    </button>)}
  </div>
}
