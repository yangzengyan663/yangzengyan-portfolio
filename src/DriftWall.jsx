import { useMemo } from 'react'
import { ArrowUpRight, Play } from 'lucide-react'
import './DriftWall.css'

const clampColumns = value => Math.max(1, Math.min(8, Math.round(value || 1)))

export default function DriftWall({
  items = [],
  columns = 5,
  tileWidth = 200,
  tileHeight = 124,
  gap = 16,
  tilt = 16,
  turn = -8,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = .45,
  parallax = .6,
  lift = 48,
  fade = .2,
  dim = .65,
  overlayColor = '#060010',
  radius = 15,
  roll = 0,
  pauseOnHover = false,
  grayscale = false,
  onItemClick,
}) {
  const safeColumns = clampColumns(columns)
  const columnItems = useMemo(() => {
    if (!items.length) return []
    // Mix categories once, then keep a shared rhythm so equal works cannot
    // drift together as independently timed columns overtake each other.
    const mixed = [...items]
    let seed = 617
    for (let index = mixed.length - 1; index > 0; index -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const other = seed % (index + 1)
      ;[mixed[index], mixed[other]] = [mixed[other], mixed[index]]
    }
    const gcd = (a, b) => b ? gcd(b, a % b) : a
    let rowStep = Math.max(1, Math.round(Math.sqrt(items.length)))
    while (gcd(rowStep, items.length) !== 1) rowStep -= 1
    return Array.from({ length: safeColumns }, (_, columnIndex) => {
      // Diagonally interleave the collection, including across the loop seam.
      return Array.from({ length: items.length }, (_, itemIndex) =>
        mixed[(itemIndex * rowStep + columnIndex) % mixed.length])
    })
  }, [items, safeColumns])

  const openItem = item => {
    if (onItemClick) onItemClick(item)
    else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer')
  }

  return <div
    className={`drift-wall ${pauseOnHover ? 'drift-wall-pause' : ''} ${grayscale ? 'drift-wall-grayscale' : ''}`}
    style={{
      '--drift-columns': safeColumns,
      '--drift-tile-width': `${tileWidth}px`,
      '--drift-tile-height': `${tileHeight}px`,
      '--drift-gap': `${gap}px`,
      '--drift-tilt': `${tilt}deg`,
      '--drift-turn': `${turn}deg`,
      '--drift-perspective': `${perspective}px`,
      '--drift-depth': `${depth}px`,
      '--drift-parallax': parallax,
      '--drift-lift': `${lift}px`,
      '--drift-fade': fade,
      '--drift-dim': dim,
      '--drift-overlay': overlayColor,
      '--drift-radius': `${radius}px`,
      '--drift-roll': `${roll}deg`,
    }}
  >
    <div className="drift-wall-plane">
      {columnItems.map((column, columnIndex) => {
        const duration = Math.max(12, speed)
        const reverse = direction === 'down'
        const loopItems = [...column, ...column]
        return <div className="drift-wall-column" key={columnIndex} style={{ '--drift-column': columnIndex }}>
          <div className={`drift-wall-track ${reverse ? 'is-down' : ''}`} style={{ '--drift-duration': `${duration}s`, '--drift-delay': '0s' }}>
            {loopItems.map((item, itemIndex) => <button
              className="drift-wall-tile"
              type="button"
              key={`${columnIndex}-${itemIndex}-${item.title}`}
              onClick={() => openItem(item)}
              aria-label={`播放 ${item.title}`}
              tabIndex={itemIndex >= column.length ? -1 : 0}
              aria-hidden={itemIndex >= column.length ? 'true' : undefined}
            >
              <img src={item.image} alt="" loading="lazy" draggable="false" style={{ objectFit: item.fit || 'cover' }} />
              <span className="drift-wall-shade" />
              <span className="drift-wall-meta"><small>{item.category || 'SELECTED FILM'}</small><strong>{item.title}</strong></span>
              <span className="drift-wall-play"><Play size={13} fill="currentColor" /><ArrowUpRight size={13} /></span>
            </button>)}
          </div>
        </div>
      })}
    </div>
    <span className="drift-wall-vignette" aria-hidden="true" />
  </div>
}
