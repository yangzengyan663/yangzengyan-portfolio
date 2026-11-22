import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const mediaRoot = 'https://raw.githubusercontent.com/yangzengyan663/yangzengyan-portfolio/main/public'
const fullSite = 'https://yangzengyan-portfolio.pages.dev/'
const films = [
  ['《金缮》', '传统文化', 'chinese-culture/jinshan.mp4', '/media-previews/jinshan.jpg', true],
  ['《迷雾中的古蜀》', '传统文化', 'chinese-culture/new-li-bai.mp4', '/media-previews/ancient-shu.jpg', true],
  ['Quiet Mind · TJAX 02', '音乐 MV', 'digital-human-series/tjax-02.mp4', '/media-previews/mv-tjax-02.webp', true],
  ['SeaGames · 产品宣传片 01', '商业广告', 'advertising-series/seagames-01.mp4', '/media-previews/seagames-1.jpg', true],
  ['《将星》广告短片', '商业广告', 'jiangxing-laptop/jiangxing-laptop-ad.mp4', '/media-previews/jiangxing.jpg', true],
  ['fifi_Gia · FILM 03', '虚拟角色', 'fifi-gia/ip-3.mp4', '/images/fifi-gia-film-3-cover.webp', true],
  ['LUNA', '音乐 MV', 'digital-human-series/luna.mp4', '/media-previews/mv-luna.webp'],
  ['MARCUS SAINT 01', '音乐 MV', 'digital-human-series/marcus-saint-01.mp4', '/media-previews/mv-marcus-saint-01.webp'],
  ['MARCUS SAINT 02', '音乐 MV', 'digital-human-series/marcus-saint-02.mp4', '/media-previews/mv-marcus-saint-02.webp'],
  ['MARCUS SAINT 03', '音乐 MV', 'digital-human-series/marcus-saint-03.mp4', '/media-previews/mv-marcus-saint-03.webp'],
  ['MILO', '音乐 MV', 'digital-human-series/milo.mp4', '/media-previews/mv-milo.webp'],
  ['OLILA', '音乐 MV', 'digital-human-series/olila.mp4', '/media-previews/mv-olila.webp'],
  ['SERAPHINA', '音乐 MV', 'digital-human-series/seraphina.mp4', '/media-previews/mv-seraphina.webp'],
  ['SOREN', '音乐 MV', 'digital-human-series/soren.mp4', '/media-previews/mv-soren.webp'],
  ['TJAX', '音乐 MV', 'digital-human-series/tjax.mp4', '/media-previews/mv-tjax.webp'],
  ['《杯具人》01', '动画短剧', 'cup-people/1.mp4', '/media-previews/cup-1.jpg'],
  ['《杯具人》02', '动画短剧', 'cup-people/2.mp4', '/media-previews/cup-2.jpg'],
  ['《杯具人》03', '动画短剧', 'cup-people/3.mp4', '/media-previews/cup-3.jpg'],
  ['《杯具人》04', '动画短剧', 'cup-people/4.mp4', '/media-previews/cup-4.jpg'],
  ['《杯具人》特别篇', '动画短剧', 'cup-people/cup-person-part-1.mp4', '/media-previews/cup-special.jpg'],
  ['fifi_Gia · FILM 01', '虚拟角色', 'fifi-gia/ip-1-compatible.mp4', '/images/fifi-gia-film-1-cover.webp'],
  ['黑白造境 · 时装短片', '虚拟角色', 'fifi-gia/ip-2.mp4', '/images/fifi-gia-film-2-cover.webp'],
  ['色彩肖像 · 时尚短片', '虚拟角色', 'fifi-gia/ip-4.mp4', '/images/fifi-gia-film-4-cover.webp'],
  ['六神花露水 · 清凉驱蚊', '商业广告', 'advertising-series/ad-4.mp4', '/images/advertising-series/ad-4-cover.webp'],
  ['小熊猫的海岛假日', '商业广告', 'advertising-series/ad-1.mp4', '/images/advertising-series/ad-1-cover.webp'],
  ['SeaArt · 分层创意编辑', '商业广告', 'advertising-series/ad-2.mp4', '/images/advertising-series/ad-2-cover.webp'],
  ['赛博角色 · 从设定到场景', '商业广告', 'advertising-series/ad-3.mp4', '/images/advertising-series/ad-3-cover.webp'],
  ['SeaGames · 产品宣传片 02', '商业广告', 'advertising-series/seagames-02.mp4', '/media-previews/seagames-2.jpg'],
].map(([title, category, file, poster, featured = false]) => ({ title, category, file, poster, featured }))

assert.equal(films.length, 28)
assert.equal(new Set(films.map(film => film.file)).size, 28)
assert.equal(films.filter(film => film.featured).length, 6)
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const videoUrl = film => `${mediaRoot}/videos/${film.file}?v=20261112`
const posterUrl = film => mediaRoot + film.poster
const card = film => `<a class="film" data-play href="${escape(videoUrl(film))}" data-title="${escape(film.title)}" data-poster="${escape(posterUrl(film))}"><div class="cover"><span class="cover-fallback" aria-hidden="true">${escape(film.category)}</span><img src="${escape(posterUrl(film))}" alt="${escape(film.title)}封面" loading="lazy" decoding="async" width="640" height="400"><span class="watch">观看影片</span></div><div class="film-copy"><small>${escape(film.category)}</small><h3>${escape(film.title)}</h3></div></a>`
const categories = ['音乐 MV', '动画短剧', '虚拟角色', '商业广告']
const more = categories.map(category => {
  const items = films.filter(film => !film.featured && film.category === category)
  return `<details class="series"><summary><span>${escape(category)}</span><span class="count">更多 ${items.length} 部</span></summary><div class="film-grid">${items.map(card).join('')}</div></details>`
}).join('')

const css = `
:root{color-scheme:dark;--ink:#f7f2ff;--muted:#b7abc9;--accent:#cda5ff;--line:#3c2c50;--surface:#171020}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:1.5rem}body{margin:0;background:#090610;color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Microsoft YaHei",sans-serif}a{color:inherit}a,button,summary{-webkit-tap-highlight-color:transparent}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:5px}button{font:inherit;cursor:pointer}header,main,footer{width:min(1120px,calc(100% - 48px));margin:auto}.topbar{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:24px 0;border-bottom:1px solid var(--line)}.brand{font-size:14px;letter-spacing:.1em;text-decoration:none;font-weight:750}.top-links{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:20px;font-size:14px}.top-links a{text-decoration:none;color:var(--muted)}.top-links a:hover{color:var(--accent)}.intro{padding:clamp(48px,8vw,92px) 0 54px;max-width:850px}.eyebrow{margin:0 0 16px;color:var(--accent);font-size:14px;font-weight:650;letter-spacing:.13em}.intro h1{margin:0;font-size:clamp(38px,6.6vw,76px);line-height:1.15;font-weight:650;letter-spacing:-.045em}.intro h1 span{display:block;color:var(--accent)}.intro .description{max-width:650px;margin:24px 0;color:var(--muted);font-size:clamp(16px,2vw,18px)}.intro-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.action{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:10px 19px;border:1px solid var(--line);border-radius:8px;background:var(--surface);text-decoration:none;font-size:16px;font-weight:600;color:var(--ink)}.action.primary{background:var(--accent);color:#1b0c2d;border-color:var(--accent)}.action:hover{filter:brightness(1.1)}.section-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 22px}.section-head h2{font-size:26px;line-height:1.3;margin:0;font-weight:650}.section-head p{font-size:14px;color:var(--muted);margin:0}.film-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.film{display:block;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-decoration:none;transition:border-color .15s}.film:hover{border-color:var(--accent)}.cover{position:relative;isolation:isolate;aspect-ratio:8/5;overflow:hidden;background:radial-gradient(ellipse at 30% 20%,#52336d,#171020 70%)}.cover-fallback{position:absolute;inset:0;display:grid;place-items:center;color:#d0b5ed;font-size:22px;letter-spacing:.12em}.cover img{position:relative;display:block;width:100%;height:100%;object-fit:cover;background:transparent}.cover img[hidden]{display:none}.watch{position:absolute;right:12px;bottom:12px;padding:5px 10px;border:1px solid #ffffff40;border-radius:6px;color:white;background:#0d071bdd;font-size:14px;font-weight:600}.film-copy{padding:17px 18px 20px}.film-copy small{color:var(--accent);font-size:14px}.film-copy h3{font-size:17px;line-height:1.5;margin:6px 0 0;overflow-wrap:anywhere;font-weight:600}.archive{margin:60px 0}.series{border-top:1px solid var(--line);padding:0 0 3px}.series:last-child{border-bottom:1px solid var(--line)}.series summary{display:flex;align-items:center;gap:12px;cursor:pointer;padding:22px 4px;list-style:none;font-size:20px;font-weight:600}.series summary::-webkit-details-marker{display:none}.series summary::after{content:'+';color:var(--accent);font-size:24px;margin-left:auto;font-weight:400}.series[open] summary::after{content:'−'}.series .count{font-size:14px;font-weight:400;color:var(--muted)}.series .film-grid{padding-bottom:26px}.about{display:grid;grid-template-columns:1fr 1fr;gap:35px;padding:35px 0 50px;border-top:1px solid var(--line)}.about h2{font-size:26px;margin:0 0 12px}.about p{margin:0;color:var(--muted);max-width:600px}.about dl{margin:0;display:grid;gap:14px}.about dl div{display:grid;grid-template-columns:90px 1fr;gap:14px}.about dt{color:var(--muted)}.about dd{margin:0;overflow-wrap:anywhere}.about a{color:var(--accent)}footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding:22px 0 35px;color:var(--muted);font-size:14px}footer a{color:var(--accent)}dialog{padding:0;color:var(--ink);background:#120b1c;border:1px solid #684983;border-radius:14px;width:min(1000px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto}dialog::backdrop{background:#030107e8}.player-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px}.player-head h2{margin:0;font-size:20px;line-height:1.4;overflow-wrap:anywhere}.player-head form{flex:0 0 auto}.close{min-height:42px;padding:7px 15px;border:1px solid var(--line);border-radius:7px;background:#251634;color:var(--ink)}video{display:block;width:100%;max-height:68dvh;aspect-ratio:16/9;object-fit:contain;background:#000}.player-foot{padding:15px 20px 20px}.player-foot p{margin:0 0 12px;color:var(--muted);font-size:15px}.player-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.player-actions .action{font-size:15px;min-height:42px;padding:7px 13px}[hidden]{display:none!important}@media(max-width:800px){.film-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.about{grid-template-columns:1fr;gap:24px}}@media(max-width:480px){header,main,footer{width:calc(100% - 32px)}.topbar{align-items:flex-start;padding:18px 0;gap:12px}.brand{font-size:12px;max-width:130px}.top-links{gap:12px;font-size:14px}.intro{padding:40px 0}.intro h1{font-size:clamp(34px,10.5vw,48px)}.film-grid{grid-template-columns:1fr;gap:18px}.film-copy{padding:15px 16px 18px}.section-head h2,.about h2{font-size:24px}.archive{margin:42px 0}.player-head{padding:14px}.player-head h2{font-size:17px}.player-foot{padding:14px}.about dl div{grid-template-columns:75px 1fr;gap:10px}.series summary{font-size:18px}.series .count{font-size:14px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
`

const browserScript = String.raw`(() => {
  const dialog = document.getElementById('player');
  const video = document.getElementById('film-video');
  const heading = document.getElementById('film-title');
  const status = document.getElementById('film-status');
  const direct = document.getElementById('film-direct');
  const retry = document.getElementById('film-retry');
  let opener = null;
  let source = '';
  let generation = 0;
  let timer;
  document.addEventListener('error', event => {
    if (event.target.matches && event.target.matches('.cover img')) event.target.hidden = true;
  }, true);
  const clearDeadline = () => window.clearTimeout(timer);
  const release = () => {
    generation += 1;
    clearDeadline();
    video.pause();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    video.load();
    source = '';
    if (opener && opener.isConnected) opener.focus();
    opener = null;
  };
  const play = () => {
    if (!source || !dialog.open) return;
    const attempt = ++generation;
    clearDeadline();
    retry.hidden = true;
    status.textContent = '正在加载视频，也可使用播放器控制播放。';
    video.src = source;
    timer = window.setTimeout(() => {
      if (generation !== attempt || !dialog.open) return;
      status.textContent = '视频加载较慢，可重试或直接观看。';
      retry.hidden = false;
    }, 9000);
    video.play().catch(error => {
      if (attempt !== generation || !dialog.open || error.name === 'AbortError') return;
      clearDeadline();
      status.textContent = error.name === 'NotAllowedError' ? '点击播放器中的播放按钮即可观看。' : '视频暂未加载，可重试或直接观看。';
      retry.hidden = error.name === 'NotAllowedError';
    });
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-play]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = link;
    source = link.href;
    heading.textContent = link.dataset.title;
    direct.href = source;
    video.poster = link.dataset.poster;
    dialog.showModal();
    play();
  });
  video.addEventListener('playing', () => {
    if (!dialog.open || !source) return;
    clearDeadline();
    retry.hidden = true;
    status.textContent = '正在播放，可使用播放器调节声音或进入全屏。';
  });
  video.addEventListener('waiting', () => {
    if (dialog.open && source) status.textContent = '正在缓冲，可稍候或直接观看。';
  });
  video.addEventListener('error', () => {
    if (!dialog.open || !source || !video.error) return;
    clearDeadline();
    retry.hidden = false;
    status.textContent = '视频暂时无法播放，可重试或直接观看。';
  });
  retry.addEventListener('click', play);
  dialog.addEventListener('close', release);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();`

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#090610"><meta name="portfolio-build" content="20261122-quick-entry"><meta name="portfolio-quick-build" content="20261122-quick-entry"><meta name="description" content="杨增延 AIGC 视觉设计作品集：28 部原创音乐 MV、动画短剧、传统文化影像、虚拟角色与商业广告。"><title>杨增延 · AIGC 影像作品集</title><style>${css}dialog:not([open]){display:none}</style></head>
<body><header><div class="topbar"><a class="brand" href="#top">YANG ZENGYAN<br>AIGC VISUAL DESIGNER</a><nav class="top-links" aria-label="主导航"><a href="#selected">精选作品</a><a href="#archive">全部作品</a><a href="mailto:2206573527@qq.com">联系我</a></nav></div></header>
<main id="top"><section class="intro" aria-labelledby="intro-title"><p class="eyebrow">AI / MOTION / BRAND</p><h1 id="intro-title">杨增延<span>让想象成为影像。</span></h1><p class="description">AIGC 视觉设计师，专注 AI 视频、品牌影像与社交媒体内容。从视觉创意、角色设定到动态制作与后期剪辑，探索艺术与技术的交汇。</p><div class="intro-actions"><a class="action primary" href="#selected">观看精选作品</a><a class="action" href="mailto:2206573527@qq.com">联系我</a></div></section>
<section id="selected" aria-labelledby="selected-title"><div class="section-head"><h2 id="selected-title">精选影像</h2><p>6 部精选 · 点击播放完整视频</p></div><div class="film-grid">${films.filter(film => film.featured).map(card).join('')}</div></section>
<section class="archive" id="archive" aria-labelledby="archive-title"><div class="section-head"><h2 id="archive-title">更多作品</h2><p>共 28 部影像 · 按系列浏览</p></div>${more}</section>
<section class="about" aria-labelledby="about-title"><div><h2 id="about-title">关于我</h2><p>四川音乐学院 · 艺术与科技系<br>2027 届应届毕业生。拥有 AI 内容运营实习经验，熟练运用 AI 生成、UE5、3D 与视频后期工具，完成适配品牌与平台的视觉内容。</p></div><dl><div><dt>创作方向</dt><dd>AIGC 视觉 / 品牌影像 / 视频后期</dd></div><div><dt>所在地</dt><dd>成都，重庆</dd></div><div><dt>电子邮箱</dt><dd><a href="mailto:2206573527@qq.com">2206573527@qq.com</a></dd></div></dl></section></main>
<footer><span>杨增延 · 影像作品集</span><a href="${fullSite}">完整视觉版</a></footer>
<dialog id="player" aria-labelledby="film-title"><div class="player-head"><h2 id="film-title">作品播放</h2><form method="dialog"><button class="close" type="submit" aria-label="关闭播放器">关闭</button></form></div><video id="film-video" controls playsinline preload="none"></video><div class="player-foot"><p id="film-status" role="status">点击播放器中的播放按钮即可观看。</p><div class="player-actions"><button class="action" id="film-retry" type="button" hidden>重新加载</button><a class="action" id="film-direct" target="_blank" rel="noopener noreferrer">直接观看视频</a></div></div></dialog>
<script>${browserScript}</script></body></html>`

assert.equal((html.match(/data-play href=/g) || []).length, 28)
assert(!/<script[^>]+src=|<link[^>]+stylesheet|autoplay|@import|fonts\./i.test(html))
const bytes = Buffer.byteLength(html)
const compressed = gzipSync(html).length
assert(compressed < 10 * 1024, `Quick entry exceeds gzip budget: ${compressed} bytes`)
const directory = new URL('../quick-dist/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('index.html', directory), html)
await writeFile(new URL('.nojekyll', directory), '')
console.log(JSON.stringify({ output: new URL('index.html', directory).pathname, films: films.length, featured: 6, htmlBytes: bytes, gzipBytes: compressed, externalScripts: 0, externalStylesheets: 0 }))
