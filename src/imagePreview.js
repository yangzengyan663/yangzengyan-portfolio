import { prepareImage, preparedImageSource } from './preparedImages.js'

// Keep the visible gallery image until the original has loaded and decoded.
export function loadPreviewOriginal(source, onChange) {
  let active = true
  const update = state => { if (active) onChange({ source, ...state }) }
  const ready = preparedImageSource(source)
  if (ready) update({ status: 'ready', url: ready })
  else {
    update({ status: 'loading' })
    prepareImage(source).then(() => {
      const url = preparedImageSource(source)
      update(url ? { status: 'ready', url } : { status: 'error' })
    }, () => update({ status: 'error' }))
  }
  return () => { active = false }
}
