import { useEffect, useRef, useState } from 'react'
import LazyImage from './LazyImage'
import { isPlayerOpen, previewPoster, previewUrl } from './media'
import { bindHoverPreview } from './hoverPreviewController'

// Keep every cover in the real opening progress; load a clip only on intent.
export default function PreviewVideo({
  src, poster, rootMargin = '800px 0px', className = '', alt = '视频首帧',
  active: ignoredActive, autoPlay, muted, loop, playsInline, preload, controls, style, ...props
}) {
  const imageRef = useRef(null)
  const videoRef = useRef(null)
  const controllerRef = useRef(null)
  const [active, setActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const host = imageRef.current?.closest('button, a')
    if (!host) return
    const controller = bindHoverPreview(host, {
      source: previewUrl(src),
      canStart: () => !isPlayerOpen() && (!window.__portfolioOpening || window.__portfolioOpening.isFinished()),
      onActivate: () => setActive(true),
      onDeactivate: () => { setActive(false); setPlaying(false) },
      onPlaying: () => setPlaying(true),
    })
    controllerRef.current = controller
    return () => { controller.dispose(); controllerRef.current = null }
  }, [src])
  useEffect(() => {
    if (active && videoRef.current) return controllerRef.current?.attachVideo(videoRef.current)
  }, [active])
  return <><LazyImage {...props} ref={imageRef} src={poster || previewPoster(src)} alt={alt} style={style}
    className={`preview-video-poster ${className}`.trim()}
    rootMargin={rootMargin === '0px' ? '800px 0px' : rootMargin} />
    {active && <video ref={videoRef} className={`portfolio-hover-preview ${playing ? 'is-playing' : ''}`}
      style={style?.objectFit ? { objectFit: style.objectFit } : undefined}
      muted loop playsInline preload="none" tabIndex={-1} aria-hidden="true" />}</>
}
