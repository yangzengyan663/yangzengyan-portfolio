import { build } from 'vite'
import { access, cp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.env.PORTFOLIO_BASE_PATH = '/yangzengyan-portfolio/'
process.env.VITE_STATIC_MIRROR = 'true'
const output = path.resolve('dist-github')
await build({ build: { outDir: output } })
// A sparse source checkout may keep the original assets in a separate directory.
if (process.env.PORTFOLIO_ASSET_ROOT) {
  await cp(path.resolve(process.env.PORTFOLIO_ASSET_ROOT), output, { recursive: true })
}
for (const filename of ['_worker.js', '_routes.json', '_headers']) {
  await rm(path.join(output, filename), { force: true })
}
async function removeUnusedPreviews(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name)
    if (item.isDirectory()) await removeUnusedPreviews(filename)
    else if (item.name.endsWith('.mp4')) await rm(filename)
  }
}
await removeUnusedPreviews(path.join(output, 'media-previews'))
const source = await readFile('index.html', 'utf8')
const films = [...source.matchAll(/href="\/media\/([^"?]+)\?/g)].map(match => match[1])
if (new Set(films).size !== 28) throw new Error('Expected all 28 original films')
await Promise.all([...films.map(film => path.join(output, 'videos', film)), path.join(output, 'mark.svg')].map(filename => access(filename)))
await writeFile(path.join(output, '.nojekyll'), '')
console.log('Original portfolio mirror ready: all 28 films, image-first gallery, original effects.')
