import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import './Masonry.css'

const useMedia = (queries, values, defaultValue) => {
  const getValue = () => {
    if (typeof window === 'undefined') return defaultValue
    return values[queries.findIndex(query => window.matchMedia(query).matches)] ?? defaultValue
  }
  const [value, setValue] = useState(getValue)

  useEffect(() => {
    const handler = () => setValue(getValue())
    const mediaQueries = queries.map(query => window.matchMedia(query))
    mediaQueries.forEach(query => query.addEventListener('change', handler))
    return () => mediaQueries.forEach(query => query.removeEventListener('change', handler))
  }, [queries, values])

  return value
}

const useMeasure = () => {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

const preloadImages = urls => Promise.all(urls.map(src => new Promise(resolve => {
  const image = new Image()
  image.src = src
  image.onload = image.onerror = resolve
})))

const getInitialPosition = (item, direction, container) => {
  if (!container) return { x: item.x, y: item.y }
  const directions = ['top', 'bottom', 'left', 'right']
  const resolvedDirection = direction === 'random'
    ? directions[Math.floor(Math.random() * directions.length)]
    : direction

  switch (resolvedDirection) {
    case 'top': return { x: item.x, y: -item.h - 120 }
    case 'bottom': return { x: item.x, y: window.innerHeight + 160 }
    case 'left': return { x: -item.w - 140, y: item.y }
    case 'right': return { x: container.clientWidth + 140, y: item.y }
    case 'center': return { x: container.clientWidth / 2 - item.w / 2, y: container.clientHeight / 2 - item.h / 2 }
    default: return { x: item.x, y: item.y + 100 }
  }
}

export default function Masonry({
  items,
  renderItem,
  ease = 'power3.out',
  duration = 1.1,
  stagger = 0.05,
  animateFrom = 'random',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  className = '',
}) {
  const columns = useMedia(
    ['(min-width:1100px)', '(min-width:560px)'],
    [3, 2],
    1,
  )
  const [containerRef, { width }] = useMeasure()
  const [imagesReady, setImagesReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const hasMounted = useRef(false)
  const hasEntered = useRef(false)

  useEffect(() => {
    let active = true
    setImagesReady(false)
    preloadImages(items.map(item => item.img)).then(() => {
      if (active) setImagesReady(true)
    })
    return () => { active = false }
  }, [items])

  useEffect(() => {
    const host = containerRef.current
    if (!host) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasEntered.current) return
      hasEntered.current = true
      setIsVisible(true)
      observer.disconnect()
    }, { threshold: 0.08, rootMargin: '0px 0px -7%' })
    observer.observe(host)
    return () => observer.disconnect()
  }, [containerRef])

  const grid = useMemo(() => {
    if (!width) return []

    if (columns >= 4 && items.length === 10) {
      const editorialLayout = [
        { x: .015, y: .12, width: .105, rotation: 0 },
        { x: .17, y: .00, width: .31, rotation: 0 },
        { x: .52, y: .04, width: .25, rotation: 0 },
        { x: .41, y: .215, width: .14, rotation: 0 },
        { x: .14, y: .22, width: .24, rotation: 0 },
        { x: .57, y: .22, width: .25, rotation: 0 },
        { x: .88, y: .11, width: .10, rotation: 0 },
        { x: .13, y: .40, width: .28, rotation: 0 },
        { x: .44, y: .435, width: .23, rotation: 0 },
        { x: .70, y: .41, width: .24, rotation: 0 },
      ]

      return items.map((item, index) => {
        const placement = editorialLayout[index]
        const cardWidth = width * placement.width
        const height = Math.max(180, Math.round(cardWidth / (item.aspectRatio || 1.5)))
        return {
          ...item,
          x: width * placement.x,
          y: width * placement.y,
          w: cardWidth,
          h: height,
          rotation: placement.rotation,
        }
      })
    }

    const gap = Math.max(12, Math.min(22, width * 0.012))
    const columnHeights = new Array(columns).fill(0)
    const columnWidth = (width - gap * (columns - 1)) / columns

    return items.map(item => {
      const isTallPortrait = (item.aspectRatio || 1) <= 0.6
      const preferredColumns = columns >= 3 && isTallPortrait
        ? [0, columns - 1]
        : Array.from({ length: columns }, (_, index) => index)
      const column = preferredColumns.reduce((shortest, candidate) => columnHeights[candidate] < columnHeights[shortest] ? candidate : shortest, preferredColumns[0])
      const height = Math.max(180, Math.round(item.aspectRatio ? columnWidth / item.aspectRatio : item.height))
      const x = (columnWidth + gap) * column
      const y = columnHeights[column]
      columnHeights[column] = y + height + gap
      return { ...item, x, y, w: columnWidth, h: height, rotation: 0 }
    })
  }, [columns, items, width])
  const gridHeight = useMemo(() => grid.reduce((height, item) => Math.max(height, item.y + item.h), 0), [grid])

  useLayoutEffect(() => {
    if (!imagesReady || !isVisible || !grid.length) return undefined
    const host = containerRef.current
    const animationContext = gsap.context(() => {
      grid.forEach((item, index) => {
        const selector = `[data-key="${item.id}"]`
        const target = host?.querySelector(selector)
        if (!target) return
        const layout = { x: item.x, y: item.y, width: item.w, height: item.h, rotation: item.rotation }

        if (!hasMounted.current) {
          const initialPosition = getInitialPosition(item, animateFrom, host)
          gsap.fromTo(target,
            { opacity: 0, x: initialPosition.x, y: initialPosition.y, width: item.w, height: item.h, rotation: item.rotation * 1.75, ...(blurToFocus ? { filter: 'blur(10px)' } : {}) },
            { opacity: 1, ...layout, ...(blurToFocus ? { filter: 'blur(0px)' } : {}), duration: 0.8, ease: 'power3.out', delay: index * stagger, overwrite: 'auto' },
          )
        } else {
          gsap.to(target, { opacity: 1, filter: 'blur(0px)', ...layout, duration, ease, overwrite: 'auto' })
        }
      })
    }, host)
    hasMounted.current = true
    return () => animationContext.getTweens().forEach(tween => tween.kill())
  }, [animateFrom, blurToFocus, duration, ease, grid, imagesReady, isVisible, stagger])

  const handleMouseEnter = (event, item) => {
    if (!scaleOnHover) return
    gsap.to(event.currentTarget.closest('[data-key]'), { scale: hoverScale, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
  }
  const handleMouseLeave = event => {
    if (!scaleOnHover) return
    gsap.to(event.currentTarget.closest('[data-key]'), { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
  }

  return <div ref={containerRef} className={`masonry-list ${className}`} style={{ height: gridHeight || undefined }}>
    {grid.map(item => <div
      key={item.id}
      data-key={item.id}
      className={`masonry-item-wrapper ${colorShiftOnHover ? 'masonry-item-wrapper--shift' : ''}`}
      onMouseEnter={event => handleMouseEnter(event, item)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="masonry-item-content">
        {renderItem ? renderItem(item) : <img src={item.img} alt="" />}
        {colorShiftOnHover && <div className="masonry-color-overlay" />}
      </div>
    </div>)}
  </div>
}
