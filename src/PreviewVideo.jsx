import LazyImage from './LazyImage'
import { previewPoster } from './media'

// Cards always show a real image. Only the click-opened modal loads a film.
export default function PreviewVideo({
  src, poster, rootMargin = '800px 0px', className = '', alt = '视频首帧',
  active, autoPlay, muted, loop, playsInline, preload, controls, ...props
}) {
  return <LazyImage {...props} src={poster || previewPoster(src)} alt={alt}
    className={`preview-video-poster ${className}`.trim()}
    rootMargin={rootMargin === '0px' ? '800px 0px' : rootMargin} />
}
