import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import './ProfileCard.css'

const clamp = (value, minimum = 0, maximum = 100) => Math.min(Math.max(value, minimum), maximum)

function ProfileCard({
  avatarUrl,
  iconUrl = '/mark.svg',
  grainUrl,
  innerGradient = 'linear-gradient(145deg, rgba(40, 48, 68, .5), rgba(79, 112, 141, .12))',
  behindGlowEnabled = true,
  behindGlowColor = 'rgba(120, 158, 236, .35)',
  behindGlowSize = '54%',
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  miniAvatarUrl,
  name = '杨增延',
  title = 'AIGC 设计师',
  handle = '2206573527@qq.com',
  status = 'Available',
  contactText = '联系我',
  showUserInfo = true,
  onContactClick,
}) {
  const wrapRef = useRef(null)
  const shellRef = useRef(null)
  const animationFrameRef = useRef(null)
  const valuesRef = useRef({ currentX: 0, currentY: 0, targetX: 0, targetY: 0, lastTimestamp: 0, active: false })

  const updateCardVariables = useCallback((x, y) => {
    const wrapper = wrapRef.current
    const shell = shellRef.current
    if (!wrapper || !shell) return

    const percentX = clamp((x / Math.max(shell.clientWidth, 1)) * 100)
    const percentY = clamp((y / Math.max(shell.clientHeight, 1)) * 100)
    const offsetX = percentX - 50
    const offsetY = percentY - 50

    wrapper.style.setProperty('--pointer-x', `${percentX}%`)
    wrapper.style.setProperty('--pointer-y', `${percentY}%`)
    wrapper.style.setProperty('--background-x', `${35 + percentX * .3}%`)
    wrapper.style.setProperty('--background-y', `${35 + percentY * .3}%`)
    wrapper.style.setProperty('--rotate-x', `${-(offsetY / 5.7)}deg`)
    wrapper.style.setProperty('--rotate-y', `${offsetX / 5.1}deg`)
    wrapper.style.setProperty('--pointer-distance', `${Math.min(Math.hypot(offsetX, offsetY) / 70, 1)}`)
  }, [])

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = null
    valuesRef.current.active = false
    valuesRef.current.lastTimestamp = 0
  }, [])

  const animate = useCallback(timestamp => {
    const values = valuesRef.current
    const elapsed = values.lastTimestamp ? Math.min((timestamp - values.lastTimestamp) / 1000, .05) : 0
    values.lastTimestamp = timestamp
    const smoothing = 1 - Math.exp(-elapsed / .12)

    values.currentX += (values.targetX - values.currentX) * smoothing
    values.currentY += (values.targetY - values.currentY) * smoothing
    updateCardVariables(values.currentX, values.currentY)

    const settled = Math.abs(values.targetX - values.currentX) < .08 && Math.abs(values.targetY - values.currentY) < .08
    if (settled) {
      values.currentX = values.targetX
      values.currentY = values.targetY
      updateCardVariables(values.currentX, values.currentY)
      stopAnimation()
      return
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [stopAnimation, updateCardVariables])

  const setTarget = useCallback((x, y) => {
    const values = valuesRef.current
    values.targetX = x
    values.targetY = y
    if (!values.active) {
      values.active = true
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [animate])

  const centerCard = useCallback(() => {
    const shell = shellRef.current
    if (shell) setTarget(shell.clientWidth / 2, shell.clientHeight / 2)
  }, [setTarget])

  const getPointerPosition = useCallback(event => {
    const shell = shellRef.current
    if (!shell) return null
    const bounds = shell.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }, [])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return undefined

    const initialX = Math.max(shell.clientWidth - 68, 0)
    const initialY = Math.min(58, shell.clientHeight)
    valuesRef.current.currentX = initialX
    valuesRef.current.currentY = initialY
    updateCardVariables(initialX, initialY)
    centerCard()

    if (!enableTilt) return () => stopAnimation()

    const supportsFinePointer = () => enableMobileTilt || !window.matchMedia('(pointer: coarse)').matches
    const onPointerEnter = event => {
      if (!supportsFinePointer()) return
      const position = getPointerPosition(event)
      if (!position) return
      shell.classList.add('is-active')
      setTarget(position.x, position.y)
    }
    const onPointerMove = event => {
      if (!supportsFinePointer()) return
      const position = getPointerPosition(event)
      if (position) setTarget(position.x, position.y)
    }
    const onPointerLeave = () => {
      centerCard()
      shell.classList.remove('is-active')
    }
    const onDeviceOrientation = event => {
      if (!enableMobileTilt || event.beta == null || event.gamma == null) return
      setTarget(
        clamp(shell.clientWidth / 2 + event.gamma * mobileTiltSensitivity, 0, shell.clientWidth),
        clamp(shell.clientHeight / 2 + (event.beta - 20) * mobileTiltSensitivity, 0, shell.clientHeight),
      )
    }

    shell.addEventListener('pointerenter', onPointerEnter)
    shell.addEventListener('pointermove', onPointerMove)
    shell.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('deviceorientation', onDeviceOrientation)

    return () => {
      shell.removeEventListener('pointerenter', onPointerEnter)
      shell.removeEventListener('pointermove', onPointerMove)
      shell.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('deviceorientation', onDeviceOrientation)
      stopAnimation()
    }
  }, [centerCard, enableMobileTilt, enableTilt, getPointerPosition, mobileTiltSensitivity, setTarget, stopAnimation, updateCardVariables])

  const cardStyle = useMemo(() => ({
    '--icon': iconUrl ? `url(${iconUrl})` : 'none',
    '--grain': grainUrl ? `url(${grainUrl})` : 'none',
    '--inner-gradient': innerGradient,
    '--behind-glow-color': behindGlowColor,
    '--behind-glow-size': behindGlowSize,
  }), [behindGlowColor, behindGlowSize, grainUrl, iconUrl, innerGradient])

  return <div ref={wrapRef} className={`pc-card-wrapper ${className}`.trim()} style={cardStyle}>
    {behindGlowEnabled && <span className="pc-behind" />}
    <div ref={shellRef} className="pc-card-shell">
      <section className="pc-card" aria-label={`${name} personal profile`}>
        <div className="pc-inside">
          <span className="pc-grid" />
          <span className="pc-shine" />
          <span className="pc-glare" />
          <div className="pc-avatar-content"><img className="pc-avatar" src={avatarUrl} alt={`${name} portrait`} loading="lazy" /></div>
          <div className="pc-details"><h3>{name}</h3><p>{title}</p></div>
          {showUserInfo && <div className="pc-user-info">
            <div className="pc-user-details">
              <span className="pc-mini-avatar"><img src={miniAvatarUrl || avatarUrl} alt="" /></span>
              <span className="pc-user-text"><strong>{handle}</strong><small>{status}</small></span>
            </div>
            <button className="pc-contact-btn" type="button" onClick={onContactClick}>{contactText}<ArrowUpRight size={15} /></button>
          </div>}
          <span className="pc-corner-mark" aria-hidden="true" />
        </div>
      </section>
    </div>
  </div>
}

export default memo(ProfileCard)