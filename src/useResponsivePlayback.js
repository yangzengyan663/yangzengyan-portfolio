import { useEffect, useState } from 'react'
import { choosePlaybackSources, rememberPlaybackSource } from './media'

export default function useResponsivePlayback(ref, source, attempt) {
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    const video = ref.current
    const controller = new AbortController()
    let disposed = false
    let sources = []
    let index = -1
    let timer
    let resumeAt = 0
    const clearDeadline = () => clearTimeout(timer)
    const nextSource = () => {
      if (disposed) return
      clearDeadline()
      if (index + 1 >= sources.length) { setStatus(video.error ? 'error' : 'buffering'); return }
      resumeAt = Math.max(resumeAt, video.currentTime || 0)
      index += 1
      setStatus('loading')
      video.src = sources[index]
      timer = window.setTimeout(nextSource, 4500)
      video.play().catch(error => {
        if (!disposed && error.name === 'NotAllowedError') { clearDeadline(); setStatus('paused') }
      })
    }
    const ready = () => {
      if (disposed || video.readyState < 2) return
      clearDeadline()
      setStatus('ready')
      if (sources[index]) rememberPlaybackSource(sources[index])
    }
    const waiting = () => {
      if (disposed) return
      setStatus('buffering')
      clearDeadline()
      const stalledAt = video.currentTime
      timer = window.setTimeout(() => {
        if (video.paused) return
        if (video.currentTime <= stalledAt + .1) nextSource()
        else ready()
      }, 4500)
    }
    const restorePosition = () => {
      if (resumeAt > 0 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - .1))
        resumeAt = 0
      }
    }
    const readyEvents = ['loadeddata', 'canplay', 'playing', 'seeked']
    readyEvents.forEach(event => video.addEventListener(event, ready))
    video.addEventListener('loadedmetadata', restorePosition)
    video.addEventListener('waiting', waiting)
    video.addEventListener('error', nextSource)
    setStatus('loading')
    choosePlaybackSources(source, controller.signal).then(result => {
      if (disposed) return
      sources = result
      nextSource()
    }).catch(() => { if (!disposed) setStatus('error') })
    return () => {
      disposed = true
      controller.abort()
      clearDeadline()
      readyEvents.forEach(event => video.removeEventListener(event, ready))
      video.removeEventListener('loadedmetadata', restorePosition)
      video.removeEventListener('waiting', waiting)
      video.removeEventListener('error', nextSource)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [ref, source, attempt])
  return status
}
