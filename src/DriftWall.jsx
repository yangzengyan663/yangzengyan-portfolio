import { useMemo } from 'react'
import { ArrowUpRight, Play } from 'lucide-react'
import './DriftWall.css'

export default function DriftWall({ items = [], onItemClick }) {
  const works = useMemo(() => Array.from(new Map(items.map(item => [item.href || item.image, item])).values()), [items])
  const openItem = item => {
    if (onItemClick) onItemClick(item)
    else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer')
  }
  return <div className="drift-wall drift-wall-centered">
    <div className="drift-wall-collection">
      {works.map((item, index) => <button className="drift-wall-work" type="button" key={item.href || item.image}
        style={{ '--work-offset': `${[8, -10, 14, -4][index % 4]}px`, '--work-angle': `${[-2, 1.5, -1, 2][index % 4]}deg`, '--work-delay': `${index * -.7}s` }}
        onClick={() => openItem(item)} aria-label={`播放 ${item.title}`}>
        <img src={item.image} alt="" loading="lazy" draggable="false" style={{ objectFit: item.fit || 'cover' }} />
        <span className="drift-wall-shade" />
        <span className="drift-wall-meta"><small>{item.category || 'SELECTED FILM'}</small><strong>{item.title}</strong></span>
        <span className="drift-wall-play"><Play size={13} fill="currentColor" /><ArrowUpRight size={13} /></span>
      </button>)}
    </div>
  </div>
}
