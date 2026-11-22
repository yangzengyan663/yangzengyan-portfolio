import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

// Keep the existing lazy effect chunks, but deliver the content shell in one
// response. A slow second connection must not hide an otherwise loaded page.
export function inlinePortfolioShell() {
  let config
  return {
    name: 'inline-portfolio-shell',
    apply: 'build',
    enforce: 'post',
    configResolved(value) { config = value },
    async closeBundle() {
      const directory = path.resolve(config.root, config.build.outDir)
      const indexPath = path.join(directory, 'index.html')
      let html = await readFile(indexPath, 'utf8')
      const entry = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>/)
      if (!entry) throw new Error('Portfolio entry script was not found')
      const asset = href => {
        const target = path.resolve(directory, '.' + href)
        if (!target.startsWith(directory + path.sep)) throw new Error('Invalid shell asset path')
        return target
      }
      // Use the original module URL as the base for Vite's lazy dependencies.
      const base = `new URL(${JSON.stringify(entry[1])},document.baseURI).href`
      let javascript = await readFile(asset(entry[1]), 'utf8')
      javascript = javascript
        .replace(/\bimport\s*\(\s*(["'`])\.\/([^"'`]+)\1\s*\)/g,
          (_, quote, file) => `import(new URL(${JSON.stringify('/assets/' + file)},document.baseURI).href)`)
        .replace(/import\.meta\.resolve/g, '(undefined)')
        .replace(/import\.meta\.url/g, base)
      if (/\bfrom\s*["'`]\.\//.test(javascript)) {
        throw new Error('A new shared entry dependency needs shell URL handling')
      }
      const moduleUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(javascript)
      const map = JSON.stringify({ imports: { [entry[1]]: moduleUrl } }).replace(/</g, '\\u003c')
      const boot = `<script type="importmap">${map}</script>\n<script type="module">import(${JSON.stringify(entry[1])}).catch(()=>{const note=document.getElementById('boot-note');if(note)note.textContent='可直接观看下面的作品，也可重新打开完整作品集。';});</script>`
      html = html.replace(entry[0], '')
      const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)]
      for (const style of styles) {
        const css = (await readFile(asset(style[1]), 'utf8')).replace(/<\/style/gi, '<\\/style')
        html = html.replace(style[0], '')
        // Put the readable static content before the full visual stylesheet.
        html = html.replace('</body>', `<style data-app-styles>${css}</style>\n</body>`)
      }
      html = html.replace('</body>', boot + '\n</body>')
      await writeFile(indexPath, html)
      console.log(`Portfolio shell: ${Math.round(gzipSync(html).length / 1024)} KiB gzip; no external entry JS/CSS requests`)
    },
  }
}
