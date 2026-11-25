import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import useNearViewport from './useNearViewport'
import { placeholderFor } from './posterPlaceholders'
import { assetUrl, assetSrcSet } from './assetPaths'
import { prepareImage, preparedImageSource, usePreparedImage } from './preparedImages'
import { hasPackedImage } from './displayImagePack'
import { useOpeningFinished } from './effectModules'

const LazyImage = forwardRef(function LazyImage({
  src, srcSet, sizes, rootMargin = '1600px 0px', sectionRootMargin = rootMargin,
  alt = '', className, style, loading = 'lazy', decoding = 'async', placeholder = placeholderFor(src), onLoad, ...props
}, forwardedRef) {
  const ref = useRef(null)
  const near = useNearViewport(ref, { rootMargin, sectionRootMargin, enabled: loading !== 'eager' })
  const prepared = usePreparedImage(src)
  const packed = hasPackedImage(src)
  const openingFinished = useOpeningFinished()
  const actualReveal = prepared || (near && !packed)
  useEffect(() => {
    if (packed && near && openingFinished && !prepared) prepareImage(src).catch(() => {})
  }, [src, packed, near, openingFinished, prepared])
  const [loadedKey, setLoadedKey] = useState(null)
  const sourceKey = src || srcSet || ''
  const attach = useCallback(element => {
    ref.current = element
    if (typeof forwardedRef === 'function') forwardedRef(element)
    else if (forwardedRef) forwardedRef.current = element
  }, [forwardedRef])

  const handleLoad = event => {
    const image = event.currentTarget
    if (actualReveal && image.naturalWidth > 0 && image.currentSrc !== placeholder) setLoadedKey(sourceKey)
    onLoad?.(event)
  }
  const imageStyle = placeholder ? {
    backgroundImage: `url(${JSON.stringify(placeholder)})`, backgroundPosition: 'center', backgroundSize: 'cover', ...style,
  } : style
  return <img {...props} ref={attach} src={prepared ? preparedImageSource(src) : actualReveal && src ? assetUrl(src) : placeholder || undefined} srcSet={actualReveal && !packed ? assetSrcSet(srcSet) : undefined}
    sizes={sizes} alt={alt} className={className} style={imageStyle} loading={prepared || packed ? 'eager' : loading} decoding={decoding}
    data-media-src={src} data-media-loaded={Boolean(sourceKey) && loadedKey === sourceKey} onLoad={handleLoad} />
})

export default LazyImage
