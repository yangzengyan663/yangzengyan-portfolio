import { cloneElement, isValidElement, useCallback } from 'react'
import './BorderGlow.css'

export default function BorderGlow({
  children,
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
}) {
  const updateGlow = useCallback((element, event) => {
    const bounds = element.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    const edgeDistance = Math.min(x, y, bounds.width - x, bounds.height - y)
    const edgeProgress = Math.max(0, 1 - edgeDistance / edgeSensitivity)

    element.style.setProperty('--border-glow-x', `${x}px`)
    element.style.setProperty('--border-glow-y', `${y}px`)
    const strength = edgeProgress * glowIntensity
    element.style.setProperty('--border-glow-opacity', String(Math.min(strength, 1)))
    element.style.setProperty('--border-glow-strength', String(strength))
    element.style.setProperty('--border-glow-inner-blur', (13 + strength * 18) + 'px')
    element.style.setProperty('--border-glow-outer-blur', (24 + strength * 27) + 'px')
    element.style.setProperty('--border-glow-pulse-inner-blur', (22 + strength * 25) + 'px')
    element.style.setProperty('--border-glow-pulse-outer-blur', (38 + strength * 34) + 'px')
  }, [edgeSensitivity, glowIntensity])

  if (!isValidElement(children)) return null

  const childProps = children.props
  return cloneElement(children, {
    className: `${childProps.className || ''} border-glow${animated ? ' border-glow-animated' : ''}`,
    style: {
      ...childProps.style,
      '--border-glow-color': glowColor,
      '--border-glow-background': backgroundColor,
      '--border-glow-radius': `${borderRadius}px`,
      '--border-glow-size': `${glowRadius}px`,
      '--border-glow-spread': `${coneSpread}px`,
      '--border-glow-color-a': colors[0] || '#c084fc',
      '--border-glow-color-b': colors[1] || '#f472b6',
      '--border-glow-color-c': colors[2] || '#38bdf8',
    },
    onPointerMove: event => {
      updateGlow(event.currentTarget, event)
      childProps.onPointerMove?.(event)
    },
    onPointerLeave: event => {
      event.currentTarget.style.setProperty('--border-glow-opacity', '0')
      event.currentTarget.style.setProperty('--border-glow-strength', '0')
      event.currentTarget.style.setProperty('--border-glow-inner-blur', '13px')
      event.currentTarget.style.setProperty('--border-glow-outer-blur', '24px')
      childProps.onPointerLeave?.(event)
    },
  })
}