export const siteBase = import.meta.env?.BASE_URL || '/'
export const staticMirror = import.meta.env?.VITE_STATIC_MIRROR === 'true'
export const assetUrl = source => typeof source === 'string' && source.startsWith('/') && !source.startsWith('//')
  ? siteBase.replace(/\/$/, '') + source
  : source
export const assetSrcSet = sources => sources?.split(',').map(candidate => candidate.trim().replace(/^([^\s]+)/, assetUrl)).join(', ')
