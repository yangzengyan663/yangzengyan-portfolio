let currentOwner

// A page can have many repeated archive tiles, but only one preview lease.
export function bindHoverPreview(host, { source, canStart, onActivate, onDeactivate, onPlaying }) {
  let timer, video, releaseVideo, observer
  let hovered = false, keyboard = false, activated = false, disposed = false
  const stop = () => {
    clearTimeout(timer)
    timer = undefined
    releaseVideo?.()
    releaseVideo = undefined
    video = undefined
    observer?.disconnect()
    observer = undefined
    document.removeEventListener('visibilitychange', changed)
    document.removeEventListener('portfolio-player-change', changed)
    window.removeEventListener('blur', stop)
    window.removeEventListener('scroll', scrolled)
    if (currentOwner === stop) currentOwner = undefined
    if (activated) { activated = false; onDeactivate() }
  }
  const changed = () => { if (document.hidden || !canStart()) stop() }
  const scrolled = () => {
    const bounds = host.getBoundingClientRect()
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) stop()
  }
  const start = () => {
    if (disposed || !source || document.hidden || !canStart() || currentOwner === stop) return
    currentOwner?.()
    currentOwner = stop
    document.addEventListener('visibilitychange', changed)
    document.addEventListener('portfolio-player-change', changed)
    window.addEventListener('blur', stop)
    window.addEventListener('scroll', scrolled, { passive: true })
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop() })
      observer.observe(host)
    }
    timer = setTimeout(() => {
      timer = undefined
      if (currentOwner !== stop || !canStart() || document.hidden) { stop(); return }
      activated = true
      onActivate()
    }, 180)
  }
  const enter = event => {
    if (event.pointerType === 'touch') return
    hovered = true
    keyboard = false
    start()
  }
  const leave = () => { hovered = false; if (!keyboard) stop() }
  const focus = () => {
    keyboard = host.matches(':focus-visible')
    if (keyboard) start()
  }
  const blur = event => {
    if (event.relatedTarget && host.contains(event.relatedTarget)) return
    keyboard = false
    if (!hovered) stop()
  }
  host.addEventListener('pointerenter', enter)
  host.addEventListener('pointerleave', leave)
  host.addEventListener('focusin', focus)
  host.addEventListener('focusout', blur)
  return {
    attachVideo(element) {
      if (disposed || currentOwner !== stop || !activated || !canStart()) return () => {}
      video = element
      const playing = () => { if (currentOwner === stop) onPlaying() }
      element.addEventListener('playing', playing)
      element.addEventListener('error', stop)
      const release = () => {
        element.removeEventListener('playing', playing)
        element.removeEventListener('error', stop)
        element.pause()
        element.removeAttribute('src')
        element.load()
        if (video === element) video = undefined
      }
      releaseVideo = release
      element.muted = true
      element.src = source
      try { element.play()?.catch(() => { if (video === element) stop() }) }
      catch { stop() }
      return () => { if (video === element) { release(); releaseVideo = undefined } }
    },
    dispose() {
      disposed = true
      stop()
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('focusin', focus)
      host.removeEventListener('focusout', blur)
    },
  }
}
