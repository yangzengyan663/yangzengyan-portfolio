import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { assetUrl } from './assetPaths'
import { thumbnailUrl, isPlayerOpen, setPlayerOpen } from './media'
import { preparedImageSource } from './preparedImages'
import { loadPreviewOriginal } from './imagePreview'

export default function ImagePreviewModal({ project, onClose }) {
  const source = project.image
  const closeRef = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const original = preparedImageSource(source)
  const current = result?.source === source ? result : null
  const status = original ? 'ready' : current?.status || 'loading'
  const thumbnail = thumbnailUrl(source)
  const displayed = original || current?.url || preparedImageSource(thumbnail) || assetUrl(thumbnail)

  useEffect(() => loadPreviewOriginal(source, setResult), [source, attempt])
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    const previousPlayerState = isPlayerOpen()
    const handleKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    setPlayerOpen(true)
    closeRef.current?.focus({ preventScroll: true })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      setPlayerOpen(previousPlayerState)
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  return createPortal(<div className="image-preview-modal" role="dialog" aria-modal="true" aria-label={`${project.label} image preview`} onClick={onClose}>
    <div className="image-preview-modal-inner" onClick={event => event.stopPropagation()}>
      <div className="image-preview-modal-bar"><div><small>SUPPORTING VISUAL</small><strong>{project.label}</strong></div><button ref={closeRef} className="image-preview-close" type="button" onClick={onClose} aria-label="关闭图片预览">&times;</button></div>
      <img src={displayed} alt={`${project.label} supporting visual`} loading="eager" decoding="async" data-image-quality={status === 'ready' ? 'original' : 'preview'} />
      {status !== 'ready' && <div className="image-preview-status" role={status === 'error' ? 'alert' : 'status'}>
        <p>{status === 'error' ? '原图加载失败，当前显示清晰预览。' : '正在加载原图，当前可先查看清晰预览。'}</p>
        {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>重试原图</button>}
        <a href={assetUrl(source)} target="_blank" rel="noreferrer">打开原图</a>
      </div>}
    </div>
  </div>, document.body)
}
