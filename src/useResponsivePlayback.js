import { useEffect, useRef, useState } from 'react'
import { startPlayback } from './playbackController.js'

export default function useResponsivePlayback(ref, source, attempt) {
  const [status, setStatus] = useState('loading')
  const position = useRef({ source, time: 0 })
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (position.current.source !== source) position.current = { source, time: 0 }
    return startPlayback(video, source, {
      onStatus: setStatus,
      initialPosition: position.current.time,
      onPosition: time => { position.current.time = time },
    })
  }, [ref, source, attempt])
  return status
}
