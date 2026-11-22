import { choosePlaybackSources, forgetPlaybackSource, orderedPlaybackSources, rememberPlaybackSource } from './media.js'

// Keep native loading active while a small background probe checks alternatives.
export function startPlayback(video, source, { onStatus, initialPosition = 0, onPosition = () => {} }) {
  const probe = new AbortController()
  let disposed = false
  let sources = orderedPlaybackSources(source)
  let index = -1
  let timer
  let loadId = 0
  let resumeAt = initialPosition
  const clearDeadline = () => clearTimeout(timer)
  const armDeadline = callback => {
    clearDeadline()
    timer = globalThis.setTimeout(callback, 4500)
  }
  const nextSource = (failed = true, fatal = false) => {
    if (disposed) return
    clearDeadline()
    if (failed && sources[index]) forgetPlaybackSource(sources[index])
    if (index + 1 >= sources.length) {
      onStatus(fatal || video.error ? 'error' : 'buffering')
      return
    }
    resumeAt = video.currentTime > 0 ? video.currentTime : resumeAt
    index += 1
    const currentLoad = ++loadId
    onStatus('loading')
    video.src = sources[index]
    armDeadline(nextSource)
    video.play().catch(error => {
      // A previous play() can reject after replacing its source or closing.
      if (disposed || currentLoad !== loadId || error.name === 'AbortError') return
      if (error.name === 'NotAllowedError') { clearDeadline(); onStatus('paused') }
      else nextSource(true, true)
    })
  }
  const ready = () => {
    if (disposed || video.readyState < 2) return
    clearDeadline()
    probe.abort()
    onStatus(video.paused && !video.ended ? 'paused' : 'ready')
    if (sources[index]) rememberPlaybackSource(sources[index])
  }
  const waiting = () => {
    if (disposed || video.paused) return
    onStatus('buffering')
    const stalledAt = video.currentTime
    armDeadline(() => {
      if (video.paused) return
      if (video.currentTime <= stalledAt + .1) nextSource()
      else ready()
    })
  }
  const restorePosition = () => {
    if (resumeAt > 0 && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - .1))
      resumeAt = 0
    }
  }
  const paused = () => {
    if (disposed || !video.paused) return
    clearDeadline()
    onStatus('paused')
  }
  const playing = () => {
    if (video.readyState >= 2) ready()
    else { onStatus('loading'); armDeadline(nextSource) }
  }
  const failed = () => { if (video.error) nextSource(true, true) }
  const listeners = {
    loadeddata: ready, canplay: ready, playing: ready, seeked: ready,
    loadedmetadata: restorePosition, waiting, stalled: waiting, error: failed,
    pause: paused, play: playing,
    timeupdate: () => { if (!video.paused) ready() },
  }
  Object.entries(listeners).forEach(([event, listener]) => video.addEventListener(event, listener))

  // Assign src immediately. A slow probe must not add to the first-frame wait.
  nextSource(false)
  choosePlaybackSources(source, probe.signal).then(result => {
    if (disposed || index !== 0 || video.readyState >= 2 || video.paused || result[0] === sources[0]) return
    sources = [sources[0], ...result.filter(url => url !== sources[0])]
    nextSource(false)
  }).catch(() => {}) // Cancellation or an inaccessible probe never stops native playback.

  return () => {
    disposed = true
    onPosition(video.ended ? 0 : video.currentTime > 0 ? video.currentTime : resumeAt)
    probe.abort()
    clearDeadline()
    Object.entries(listeners).forEach(([event, listener]) => video.removeEventListener(event, listener))
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
}
