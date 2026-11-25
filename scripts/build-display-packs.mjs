import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const input = process.argv[2]
if (!input) throw new Error('Pass an optimized display-image manifest JSON')
const images = JSON.parse(await readFile(input, 'utf8'))
const music = new Set(['tjax-02', 'marcus-saint-02', 'olila', 'tjax', 'marcus-saint-01'].map(name => `/media-previews/mv-${name}.webp`))
const home = new Set(['advertising-promotion', 'ai-digital-human-mv', 'animated-short-drama', 'chinese-traditional-culture', 'fifi-gia-brand'].map(name => `/images/${name}-cover.webp`))
const groupFor = source => {
  if (source === '/mark.svg' || home.has(source)) return 'home'
  if (source.includes('/profile/')) return 'profile'
  if (music.has(source)) return 'music'
  if (source.includes('/cup-')) return 'drama'
  if (/\/(?:jinshan|ancient-shu)/.test(source)) return 'culture'
  if (/fifi-gia-film-(1|3)-cover/.test(source)) return 'ip'
  if (source.includes('/seagames-')) return 'commercial'
  if (source.includes('/jiangxing')) return 'case'
  return 'archive'
}
const groups = new Map()
for (const image of images) {
  const group = groupFor(image.source)
  if (!groups.has(group)) groups.set(group, [])
  groups.get(group).push(image)
}
const packs = []
await mkdir('public/display-packs', { recursive: true })
for (const [group, entries] of groups) {
  let offset = 0
  const metadata = [], buffers = []
  for (const entry of entries) {
    const bytes = await readFile(entry.output)
    buffers.push(bytes)
    metadata.push({ source: entry.source, offset, length: bytes.length, type: entry.type })
    offset += bytes.length
  }
  const bytes = Buffer.concat(buffers)
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const url = `/display-packs/${group}-${hash}.bin`
  await writeFile(path.join('public', url), bytes)
  packs.push({ group, url, bytes: bytes.length, images: metadata })
}
if (images.length !== 42 || packs.find(pack => pack.group === 'home')?.images.length !== 6) throw new Error('Unexpected display image groups')
await writeFile('src/displayPackManifest.js', 'export default ' + JSON.stringify(packs, null, 2) + '\n')
console.log(JSON.stringify(packs.map(({ group, bytes, images }) => ({ group, bytes, images: images.length }))))
