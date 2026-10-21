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
    return Array.from({ length: safeColumns }, (_, columnIndex) => {
      const assigned = items.filter((_, itemIndex) => itemIndex % safeColumns === columnIndex)
      const source = assigned.length ? assigned : [items[columnIndex % items.length]]
      const minimumLength = Math.max(3, Math.ceil(720 / Math.max(tileHeight + gap, 1)))
      return Array.from({ length: minimumLength }, (_, itemIndex) => source[itemIndex % source.length])
    })
  }, [items, safeColumns, tileHeight, gap])

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
        const variation = 1 + ((((columnIndex * 37) % 11) / 10) - .5) * variance
        const duration = Math.max(12, speed * variation)
        const reverse = direction === 'down'
        const loopItems = [...column, ...column]
        return <div className="drift-wall-column" key={columnIndex} style={{ '--drift-column': columnIndex }}>
          <div className={`drift-wall-track ${reverse ? 'is-down' : ''}`} style={{ '--drift-duration': `${duration}s`, '--drift-delay': `${-columnIndex * 2.7}s` }}>
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
