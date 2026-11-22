import { forwardRef, useCallback, useRef, useState } from 'react'
import useNearViewport from './useNearViewport'
import { placeholderFor } from './posterPlaceholders'

const LazyImage = forwardRef(function LazyImage({
  src, srcSet, sizes, rootMargin = '800px 0px', sectionRootMargin = rootMargin,
  alt = '', className, style, loading = 'lazy', decoding = 'async', placeholder = placeholderFor(src), onLoad, ...props
}, forwardedRef) {
  const ref = useRef(null)
  const near = useNearViewport(ref, { rootMargin, sectionRootMargin, enabled: loading !== 'eager' })
  const [loadedKey, setLoadedKey] = useState(null)
  const sourceKey = src || srcSet || ''
  const attach = useCallback(element => {
    ref.current = element
    if (typeof forwardedRef === 'function') forwardedRef(element)
    else if (forwardedRef) forwardedRef.current = element
  }, [forwardedRef])

  const handleLoad = event => {
    const image = event.currentTarget
    if (near && image.naturalWidth > 0 && image.currentSrc !== placeholder) setLoadedKey(sourceKey)
    onLoad?.(event)
  }
  const imageStyle = placeholder ? {
    backgroundImage: `url(${JSON.stringify(placeholder)})`, backgroundPosition: 'center', backgroundSize: 'cover', ...style,
  } : style
  return <img {...props} ref={attach} src={near && src ? src : placeholder || undefined} srcSet={near ? srcSet : undefined}
    sizes={sizes} alt={alt} className={className} style={imageStyle} loading={loading} decoding={decoding}
    data-media-src={src} data-media-loaded={Boolean(sourceKey) && loadedKey === sourceKey} onLoad={handleLoad} />
})

export default LazyImage
