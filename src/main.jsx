import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, Clapperboard, Lightbulb, Rocket, Scissors, Sparkles, UserRound } from 'lucide-react'
import BorderGlow from './components/BorderGlow'
import AccordionGallery from './components/AccordionGallery'
import CircularGallery from './components/CircularGallery'
import WebThreads from './components/WebThreads'
import BounceCards from './components/BounceCards'
import LightPillar from './components/LightPillar'
import Masonry from './components/Masonry'
import ProfileCard from './components/ProfileCard'
import StrokeText from './components/StrokeText'
import FoldText from './components/FoldText'
import './styles.css'

const videos = [
  { title: 'LUNA', format: 'portrait-tall', video: '/videos/digital-human-series/luna.mp4', cover: '/images/digital-human-series/luna.jpg' },
  { title: 'MARCUS SAINT 01', format: 'landscape', video: '/videos/digital-human-series/marcus-saint-01.mp4', cover: '/images/digital-human-series/marcus-saint-01.png' },
  { title: 'MARCUS SAINT 02', format: 'landscape', video: '/videos/digital-human-series/marcus-saint-02.mp4', cover: '/images/digital-human-series/marcus-saint-02.png' },
  { title: 'MARCUS SAINT 03', format: 'portrait-standard', video: '/videos/digital-human-series/marcus-saint-03.mp4', cover: '/images/digital-human-series/marcus-saint-03.png' },
  { title: 'MILO', format: 'landscape', video: '/videos/digital-human-series/milo.mp4', cover: '/images/digital-human-series/milo.png' },
  { title: 'OLILA', format: 'landscape', video: '/videos/digital-human-series/olila.mp4', cover: '/images/digital-human-series/olila.png' },
  { title: 'SERAPHINA', format: 'portrait-tall', video: '/videos/digital-human-series/seraphina.mp4', cover: '/images/digital-human-series/seraphina.jpg' },
  { title: 'SOREN', format: 'landscape', video: '/videos/digital-human-series/soren.mp4', cover: '/images/digital-human-series/soren.jpg' },
  { title: 'TJAX', format: 'landscape', video: '/videos/digital-human-series/tjax.mp4', cover: '/images/digital-human-series/tjax.png' },
  { title: 'TJAX 02', format: 'landscape', video: '/videos/digital-human-series/tjax-02.mp4', cover: '/images/digital-human-series/tjax-02.png' },
]
const services = [
  ['01', '3D MODELING', 'Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.'],
  ['02', 'RENDERING', 'High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.'],
  ['03', 'MOTION DESIGN', 'Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.'],
  ['04', 'BRANDING', 'Crafting cohesive visual identities - from logos to full brand systems - that communicate a clear and memorable presence.'],
  ['05', 'WEB DESIGN', 'Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.'],
]
const heroProjects = [
  { file: 'Luna.mp4', title: 'ADVERTISING FILMS', type: 'COMMERCIAL CAMPAIGN', target: 'advertising', cover: '/images/advertising-promotion-cover.webp' },
  { file: 'Marcus Saint1.mp4', title: 'CHINESE CULTURE', type: 'TRADITIONAL CULTURAL SERIES', target: 'projects', cover: '/images/chinese-traditional-culture-cover.webp' },
  { file: 'Olila.mp4', title: 'MUSIC MV SERIES', type: 'AI DIGITAL HUMAN', target: 'music-mv', cover: '/images/ai-digital-human-mv-cover.webp' },
  { file: 'Seraphina4.mp4', title: 'CUP PEOPLE', type: 'AI ANIMATED SHORT DRAMA', target: 'price', cover: '/images/animated-short-drama-cover.webp' },
  { file: 'tjax.mp4', title: 'FIFI_GIA', type: 'IP ACCOUNT SERIES', target: 'fifi-gia', cover: '/images/fifi-gia-brand-cover.webp' },
]
const cupPeopleProjects = [
  { video: '/videos/cup-people/1.mp4', label: 'CUP PEOPLE / 01' },
  { video: '/videos/cup-people/2.mp4', label: 'CUP PEOPLE / 02' },
  { video: '/videos/cup-people/3.mp4', label: 'CUP PEOPLE / 03' },
  { video: '/videos/cup-people/4.mp4', label: 'CUP PEOPLE / 04' },
  { video: '/videos/cup-people/cup-person-part-1.mp4', label: 'CUP PEOPLE / SPECIAL' },
]
const cultureProjects = [
  {
    number: '01',
    title: '&#x91d1;&#x7f2e;',
    category: 'CHINESE CULTURAL HERITAGE',
    award: '&#x521B;&#x4F5C;&#x4F5C;&#x54C1;&#x300A;&#x91D1;&#x7F2E;&#x300B;&#xFF0C;&#x53C2;&#x52A0;&#x6559;&#x80B2;&#x90E8;&#x9AD8;&#x6559;&#x5B66;&#x4F1A;&#x5B66;&#x79D1;&#x7ADE;&#x8D5B;&#x6392;&#x884C;&#x699C;&#x8D5B;&#x9879;&#x2014;&#x2014;&#x7B2C;&#x4E8C;&#x5341;&#x5C4A;&#x4E2D;&#x56FD;&#x597D;&#x521B;&#x610F;&#x5168;&#x56FD;&#x6570;&#x5B57;&#x827A;&#x672F;&#x8BBE;&#x8BA1;&#x5927;&#x8D5B;&#xFF0C;&#x65A9;&#x83B7;&#x672C;&#x79D1;&#x7EC4;&#x4E2D;&#x56FD;&#x98CE;&#x4F20;&#x7EDF;&#x6587;&#x5316;&#x7C7B;&#x5168;&#x56FD;&#x603B;&#x51B3;&#x8D5B;&#x4E09;&#x7B49;&#x5956;&#x3002;',
    video: '/videos/chinese-culture/jinshan.mp4',
    covers: ['/images/chinese-culture/jinshan-promo-01.jpg', '/images/chinese-culture/jinshan-promo-02.jpg'],
  },
  {
    number: '02',
    title: '&#x8ff7;&#x96fe;&#x4e2d;&#x7684;&#x53e4;&#x8700;',
    category: 'ANCIENT SHU IN THE MIST',
    award: '&#x6570;&#x5B57;AIGC&#x827A;&#x672F;&#x4F5C;&#x54C1;&#x300A;&#x8FF7;&#x96FE;&#x4E2D;&#x7684;&#x53E4;&#x8700;&#x300B;&#xFF0C;&#x53C2;&#x4E0E;&#x9996;&#x5C4A;AIGC ART CN&#x4E2D;&#x56FD;&#x6570;&#x5B57;&#x6F6E;&#x6D41;&#x827A;&#x672F;&#x521B;&#x4F5C;&#x5927;&#x8D5B;&#xFF0C;&#x6210;&#x529F;&#x83B7;&#x5F97;&#x5165;&#x56F4;&#x5609;&#x5956;&#xFF0C;&#x4F5C;&#x54C1;&#x4EE5;&#x53E4;&#x8700;&#x6587;&#x5316;&#x4E3A;&#x521B;&#x4F5C;&#x6838;&#x5FC3;&#xFF0C;&#x878D;&#x5408;AI&#x6570;&#x5B57;&#x89C6;&#x89C9;&#x521B;&#x4F5C;&#x624B;&#x6CD5;&#x3002;',
    video: '/videos/chinese-culture/new-li-bai.mp4',
    poster: '/images/chinese-culture/new-li-bai-poster.jpg',
    covers: ['/images/chinese-culture/ancient-shu-01.png', '/images/chinese-culture/ancient-shu-02.png'],
  },
]
const fifiGiaProjects = [
  { label: 'FIFI_GIA / FILM 01', video: '/videos/fifi-gia/ip-1-compatible.mp4' },
  { label: 'FIFI_GIA / FILM 02', video: '/videos/fifi-gia/ip-2.mp4' },
  { label: 'FIFI_GIA / FILM 03', video: '/videos/fifi-gia/ip-3.mp4' },
  { label: 'FIFI_GIA / FILM 04', video: '/videos/fifi-gia/ip-4.mp4' },
]
const advertisingProjects = [
  { label: '花露水宣传片', video: '/videos/advertising-series/ad-4.mp4' },
  { label: '社媒-136-2D视频-SeaArt', video: '/videos/advertising-series/ad-1.mp4' },
  { label: '市场部社媒用-131-2D视频-SeaArt(3)(1)', video: '/videos/advertising-series/ad-2.mp4' },
  { label: '社媒1', video: '/videos/advertising-series/ad-3.mp4' },
]
const seaGamesProjects = [
  { label: 'SeaGames / Official Film 01', video: '/videos/advertising-series/seagames-01.mp4', image: '/images/advertising-series/seagames-01.png', number: '01' },
  { label: 'SeaGames / Official Film 02', video: '/videos/advertising-series/seagames-02.mp4', image: '/images/advertising-series/seagames-02.png', number: '02' },
]
const jiangxingProject = {
  label: '\u300a\u5c06\u661f\u300b\u7b14\u8bb0\u672c\u5e7f\u544a',
  video: '/videos/jiangxing-laptop/jiangxing-laptop-ad.mp4',
  image: '/images/jiangxing-laptop/jiangxing-laptop-poster.png',
  description: '\u5728\u4e00\u5ea7\u60ac\u4e8e\u672a\u6765\u90fd\u5e02\u4e4b\u4e0a\u7684\u65e0\u4eba\u5a5a\u793c\u53f0\uff0c\u4e00\u5bf9\u5e76\u975e\u604b\u4eba\u7684\u642d\u6863\u4f2a\u88c5\u6210\u65b0\u5a5a\u592b\u59bb\uff0c\u8bf1\u6355\u4e13\u95e8\u541e\u566c\u5a5a\u793c\u60c5\u7eea\u7684\u5de8\u578b\u673a\u68b0\u602a\u7269\u201c\u559c\u566c\u8005\u201d\u3002\u5f53\u6b66\u529b\u9677\u5165\u56f0\u5883\uff0c\u4ed6\u4eec\u5c06\u5982\u4f55\u5e94\u5bf9\u8fd9\u573a\u60ca\u9669\u7684\u751f\u6b7b\u53cd\u51fb\u3002',
}
function VideoPreviewCard({ project, onOpen }) {
  const videoRef = useRef(null)
  const previewVideo = project.video.replace('/digital-human-series/', '/digital-human-previews/')
  const preview = () => {
    const player = videoRef.current
    if (!player) return
    player.load()
    player.currentTime = 0
    player.play().catch(() => {})
  }
  const stopPreview = () => {
    const player = videoRef.current
    if (!player) return
    player.pause()
    player.currentTime = 0
  }
  return <button className={`video-tile video-tile-${project.format}`} type="button" onMouseEnter={preview} onMouseLeave={stopPreview} onFocus={preview} onBlur={stopPreview} onClick={() => onOpen(project)} aria-label={`Open ${project.title} in full video player`}>
    <img className="video-tile-cover" src={project.cover} alt={`${project.title} cover`} />
    <video ref={videoRef} src={previewVideo} muted loop playsInline preload="none" poster={project.cover} />
    <span><b>{project.title}</b><ArrowUpRight size={18} /></span><i>HOVER TO PREVIEW</i>
  </button>
}

function InViewLoopVideo({ src, rootMargin = '120px 0px', ...props }) {
  const videoRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin, threshold: .05 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVisible) video.play().catch(() => {})
    else video.pause()
  }, [isVisible])

  return <video ref={videoRef} src={src} muted loop playsInline preload={isVisible ? 'metadata' : 'none'} {...props} />
}
function Marquee() {
  const [selected, setSelected] = useState(null)
  const masonryItems = useMemo(() => videos.map((project, index) => ({
    ...project,
    id: project.video,
    img: project.cover,
    aspectRatio: project.format === 'portrait-tall' ? 9 / 16 : project.format === 'portrait-standard' ? 3 / 4 : 16 / 9,
    height: project.format === 'portrait-tall' ? 520 : project.format === 'portrait-standard' ? 410 : [300, 356, 278, 332][index % 4],
  })), [])

  return <section id="music-mv" className="marquee"><LightPillar className="marquee-light-pillar" topColor="#5227FF" bottomColor="#FF9FFC" intensity={1} rotationSpeed={0.3} glowAmount={0.002} pillarWidth={3} pillarHeight={0.4} noiseIntensity={0.5} pillarRotation={25} interactive={false} mixBlendMode="screen" quality="high" /><div className="marquee-intro"><div className="marquee-intro-top"><span>01 / SELECTED SERIES</span><span>AI DIGITAL HUMAN 璺?ORIGINAL MUSIC MV</span></div><div className="marquee-intro-content"><h2><span>&#x539f;&#x521b;&#x97f3;&#x4e50;</span><em>MV &#x7cfb;&#x5217;</em></h2><div className="marquee-intro-copy"><span className="marquee-intro-label">&#x9879;&#x76ee;&#x4ecb;&#x7ecd; / PROJECT INTRODUCTION</span><p>&#x300a;AI &#x6570;&#x5b57;&#x4eba;&#x97f3;&#x4e50; MV &#x7cfb;&#x5217;&#x300b;&#x56f4;&#x7ed5;&#x4e0d;&#x540c;&#x6570;&#x5b57;&#x4eba;&#x89d2;&#x8272;&#x5efa;&#x7acb;&#x72ec;&#x7acb;&#x7684;&#x5f62;&#x8c61;&#x8bbe;&#x5b9a;&#x4e0e;&#x97f3;&#x4e50;&#x89c6;&#x89c9;&#x98ce;&#x683c;&#xff0c;&#x5c06;&#x89d2;&#x8272;&#x5851;&#x9020;&#x3001;&#x6b4c;&#x66f2;&#x60c5;&#x7eea;&#x3001;&#x955c;&#x5934;&#x8282;&#x594f;&#x548c;&#x573a;&#x666f;&#x6c1b;&#x56f4;&#x8fdb;&#x884c;&#x8bbe;&#x8ba1;&#xff0c;&#x5f62;&#x6210;&#x5177;&#x6709;&#x8fa8;&#x8bc6;&#x5ea6;&#x7684;&#x6570;&#x5b57;&#x4eba;&#x97f3;&#x4e50;&#x8868;&#x8fbe;&#x3002;&#x9879;&#x76ee;&#x91cd;&#x70b9;&#x5448;&#x73b0;&#x4e86; AI &#x6570;&#x5b57;&#x4eba;&#x5f62;&#x8c61;&#x4e0e;&#x97f3;&#x4e50;&#x5185;&#x5bb9;&#x7ed3;&#x5408;&#x7684;&#x7cfb;&#x5217;&#x5316;&#x521b;&#x4f5c;&#x80fd;&#x529b;&#xff0c;&#x4ee5;&#x53ca;&#x4ece;&#x89c6;&#x89c9;&#x521b;&#x610f;&#x3001;&#x89d2;&#x8272;&#x98ce;&#x683c;&#x5236;&#x5b9a;&#x5230; MV &#x6210;&#x7247;&#x5236;&#x4f5c;&#x7684;&#x5b8c;&#x6574;&#x6d41;&#x7a0b;&#x3002;</p></div></div></div><div className="marquee-label"><span>AI DIGITAL HUMAN / MUSIC VIDEO SERIES</span><span>HOVER TO PREVIEW 璺?CLICK FOR FULL SCREEN</span></div><Masonry items={masonryItems} ease="power3.out" duration={1.1} stagger={0.05} animateFrom="random" scaleOnHover hoverScale={0.95} blurToFocus colorShiftOnHover={false} className="mv-masonry" renderItem={project => <VideoPreviewCard project={project} onOpen={setSelected} />} />{selected && <ShortDramaModal project={{ label: selected.title, video: selected.video }} onClose={() => setSelected(null)} />}</section>
}function About() {
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return <section id="about" className="about-profile"><div className="about-profile-stars" /><div className="about-profile-inner"><div className="about-profile-copy"><span className="about-profile-index">02 / ABOUT ME</span><h2><StrokeText text={'\u5173\u4e8e\u6211'} strokeColor="#c798ff" fillColor="#f8f4ff" strokeWidth={1.35} drawDuration={1.35} fillDelay={.08} stagger={.09} ease="power2.out" trigger="scroll" fillMode="wipe" fontSize={160} fontWeight={700} letterSpacing={-9} className="about-stroke-title" /></h2><dl className="about-profile-facts"><div><dt><FoldText text={'\u59d3\u540d'} splitBy="char" trigger="scroll" duration={.45} stagger={.06} /></dt><dd><FoldText text={'\u6768\u589e\u5ef6'} splitBy="char" trigger="scroll" duration={.5} stagger={.07} /></dd></div><div><dt><FoldText text={'\u6559\u80b2\u80cc\u666f'} splitBy="char" trigger="scroll" duration={.42} stagger={.045} /></dt><dd><FoldText text={'\u56db\u5ddd\u97f3\u4e50\u5b66\u9662 \u827a\u672f\u4e0e\u79d1\u6280\u7cfb'} splitBy="word" trigger="scroll" duration={.52} stagger={.08} /></dd></div><div><dt><FoldText text={'\u5730\u70b9'} splitBy="char" trigger="scroll" duration={.42} stagger={.06} /></dt><dd><FoldText text={'\u5168\u56fd\u5404\u5730\u90fd\u53ef\u5230\u5c97'} splitBy="char" trigger="scroll" duration={.48} stagger={.045} /></dd></div><div><dt><FoldText text={'\u7231\u597d'} splitBy="char" trigger="scroll" duration={.42} stagger={.06} /></dt><dd><FoldText text={'AIGC\u521b\u4f5c'} splitBy="char" trigger="scroll" duration={.48} stagger={.045} /><small><FoldText text={'\u719f\u7ec3\u5404\u7c7bAI\u56fe\u6587/\u89c6\u9891\u751f\u6210\u5de5\u5177\uff0c\u53ef\u72ec\u7acb\u5168\u6d41\u7a0b\u5236\u4f5c\u4e0d\u540c\u7c7b\u578b\u7684\u89c6\u9891\u3002'} splitBy="line" trigger="scroll" duration={.65} stagger={.02} /></small></dd></div></dl><p className="about-profile-description"><FoldText text={'\u6211\u662f\u6768\u589e\u5ef6\uff0c\u4e00\u540d\u517c\u5177\u827a\u672f\u5ba1\u7f8e\u3001\u6570\u5b57\u6280\u672f\u4e0e\u5546\u4e1a\u5316\u8fd0\u8425\u80fd\u529b\u76842027\u5c4a\u5e94\u5c4a\u6bd5\u4e1a\u751f\u3002\u62e5\u6709\u5b8c\u6574AI\u5185\u5bb9\u8fd0\u8425\u5b9e\u4e60\u7ecf\u9a8c\u3002\u719f\u7ec3\u8fd0\u7528AI\u751f\u6210\uff0c\u540c\u65f6\u4e5f\u7cbe\u901aUE5\u3001\u0033D\u3001\u89c6\u9891\u540e\u671f\u526a\u8f91\u5de5\u5177\uff0c\u80fd\u4ea7\u51fa\u9002\u914d\u5e73\u53f0\u6d41\u91cf\u7684\u5546\u4e1a\u89c6\u89c9\u5185\u5bb9\u3002'} splitBy="line" trigger="scroll" duration={.75} stagger={.02} /></p><button className="about-profile-cta" onClick={() => go('projects')}><FoldText text={'\u67e5\u770b\u7cbe\u9009\u4f5c\u54c1'} splitBy="char" trigger="scroll" duration={.42} stagger={.04} /><ArrowUpRight size={17} /></button></div><div className="about-profile-visual about-profile-card-panel"><ProfileCard name="&#x6768;&#x589e;&#x5ef6;" title="AIGC &#x8bbe;&#x8ba1;&#x5e08;" handle="2206573527@qq.com" status="Available" contactText="&#x8054;&#x7cfB;&#x6211;" avatarUrl="/images/profile/yang-zengyan.webp" showUserInfo enableTilt enableMobileTilt={false} onContactClick={() => { window.location.href = 'mailto:2206573527@qq.com' }} behindGlowColor="rgba(116,161,235,.36)" iconUrl="/mark.svg" behindGlowEnabled innerGradient="linear-gradient(145deg,rgba(36,48,69,.58) 0%,rgba(76,108,141,.14) 100%)" /><aside className="about-profile-workflow" aria-label="AI creative pipeline"><div className="about-workflow-heading"><span>AI CREATIVE PIPELINE</span><strong>AI &#x521B;&#x4F5C;&#x6D41;&#x7A0B;</strong></div><ol><li><span className="about-workflow-icon"><Lightbulb size={16} /></span><div><b>01</b><strong>&#x521B;&#x610F;&#x7B56;&#x7565;</strong><small>Concept Direction</small></div></li><li><span className="about-workflow-icon"><UserRound size={16} /></span><div><b>02</b><strong>&#x89D2;&#x8272;&#x8BBE;&#x5B9A;</strong><small>Character Design</small></div></li><li><span className="about-workflow-icon"><Sparkles size={16} /></span><div><b>03</b><strong>AI &#x751F;&#x6210;</strong><small>Visual Generation</small></div></li><li><span className="about-workflow-icon"><Clapperboard size={16} /></span><div><b>04</b><strong>&#x52A8;&#x6001;&#x5236;&#x4F5C;</strong><small>Motion Making</small></div></li><li><span className="about-workflow-icon"><Scissors size={16} /></span><div><b>05</b><strong>&#x540E;&#x671F;&#x526A;&#x8F91;</strong><small>Post Production</small></div></li><li><span className="about-workflow-icon"><Rocket size={16} /></span><div><b>06</b><strong>&#x6210;&#x7247;&#x843D;&#x5730;</strong><small>Final Delivery</small></div></li></ol></aside></div></div></section>
}function ShortDramaModal({ project, onClose }) {
  const videoRef = useRef(null)
  const [playerStatus, setPlayerStatus] = useState('loading')

  useEffect(() => {
    const handleKeyDown = event => { if (event.key === 'Escape') onClose() }
    const player = videoRef.current
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    if (player) {
      player.muted = true
      player.play().then(() => setPlayerStatus('ready')).catch(() => setPlayerStatus('loading'))
    }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKeyDown) }
  }, [onClose, project.video])

  const handleCanPlay = () => {
    setPlayerStatus('ready')
    videoRef.current?.play().catch(() => {})
  }

  return createPortal(<div className="short-drama-modal" role="dialog" aria-modal="true" aria-label={`${project.label} video player`} onClick={onClose}>
    <div className="short-drama-modal-inner" onClick={event => event.stopPropagation()}>
      <div className="short-drama-modal-bar"><div><small>NOW PLAYING</small><strong>{project.label}</strong></div><div><a className="short-drama-external" href={project.video} target="_blank" rel="noreferrer">OPEN VIDEO <ArrowUpRight size={16} /></a><button className="short-drama-fullscreen" onClick={() => videoRef.current?.requestFullscreen?.()}>FULL SCREEN <ArrowUpRight size={16} /></button><button className="short-drama-close" onClick={onClose} aria-label="Close player">&times;</button></div></div>
      <div className="short-drama-player-wrap"><video ref={videoRef} src={project.video} controls autoPlay muted playsInline preload="auto" onCanPlay={handleCanPlay} onError={() => setPlayerStatus('error')} />{playerStatus === 'loading' && <div className="short-drama-loading">LOADING VIDEO</div>}{playerStatus === 'error' && <div className="short-drama-error">VIDEO FAILED TO LOAD <a href={project.video} target="_blank" rel="noreferrer">OPEN DIRECTLY</a></div>}</div>
    </div>
  </div>, document.body)
}
function ImagePreviewModal({ project, onClose }) {
  useEffect(() => {
    const handleKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKeyDown) }
  }, [onClose])

  return createPortal(<div className="image-preview-modal" role="dialog" aria-modal="true" aria-label={`${project.label} image preview`} onClick={onClose}>
    <div className="image-preview-modal-inner" onClick={event => event.stopPropagation()}>
      <div className="image-preview-modal-bar"><div><small>SUPPORTING VISUAL</small><strong>{project.label}</strong></div><button className="image-preview-close" type="button" onClick={onClose} aria-label="Close image preview">&times;</button></div>
      <img src={project.image} alt={`${project.label} supporting visual`} />
    </div>
  </div>, document.body)
}function ContactModal({ onClose }) {
  const [copied, setCopied] = useState('')
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const copyValue = async (value, key) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
        const field = document.createElement('textarea')
        field.value = value
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        field.remove()
      }
      setCopied(key)
      window.setTimeout(() => setCopied(current => current === key ? '' : current), 1800)
    } catch {
      setCopied('error')
    }
  }

  const actionText = key => copied === key ? <>&#x5DF2;&#x590D;&#x5236;</> : <>&#x590D;&#x5236;</>
  return createPortal(<div className="contact-modal" role="dialog" aria-modal="true" aria-label="Contact Yang Zengyan" onClick={onClose}><section className="contact-modal-panel" onClick={event => event.stopPropagation()}><button className="contact-modal-close" type="button" onClick={onClose} aria-label="Close contact dialog">&times;</button><span className="contact-modal-kicker">CONTACT / YANG ZENGYAN</span><h2>&#x8054;&#x7CFB;&#x6211;</h2><p>&#x6B22;&#x8FCE;&#x6C42;&#x804C;&#x4EA4;&#x6D41;&#x3001;&#x521B;&#x610F;&#x5408;&#x4F5C;&#x6216;&#x9879;&#x76EE;&#x54A8;&#x8BE2;&#x3002;</p><div className="contact-modal-list"><article><span>EMAIL</span><strong>2206573527@qq.com</strong><button type="button" onClick={() => copyValue('2206573527@qq.com', 'email')}>{actionText('email')}</button></article><article><span>PHONE</span><strong>186 0285 3639</strong><button type="button" onClick={() => copyValue('18602853639', 'phone')}>{actionText('phone')}</button></article></div><div className="contact-modal-actions"><a href="mailto:2206573527@qq.com">&#x6253;&#x5F00;&#x90AE;&#x7BB1; <ArrowUpRight size={15} /></a><a href="tel:18602853639">&#x76F4;&#x63A5;&#x62E8;&#x6253; <ArrowUpRight size={15} /></a></div>{copied === 'error' && <small className="contact-modal-error">&#x8BF7;&#x624B;&#x52A8;&#x590D;&#x5236;&#x4E0A;&#x65B9;&#x8054;&#x7CFB;&#x65B9;&#x5F0F;</small>}</section></div>, document.body)
}function Services() {
  const [selectedProject, setSelectedProject] = useState(null)
  return <section id="price" className="services services-gallery"><div className="services-gallery-heading">
  <div className="services-gallery-kicker"><span>01 / SELECTED SERIES</span><span>AI SHORT DRAMA / 2026</span></div>
  <h2><span>&#x300a;&#x676f;&#x5177;&#x4eba;&#x300b;&#x7cfb;&#x5217;</span><em>AI&#x52a8;&#x753b;&#x77ed;&#x5267;</em></h2>
  <div className="services-gallery-overview"><span className="overview-mark">PROJECT OVERVIEW</span><p>&#x300a;&#x676f;&#x5177;&#x4eba;&#x300b;&#xff5c;AI&#x52a8;&#x753b;&#x77ed;&#x5267;&#x7cfb;&#x5217;&#xff1a;&#x56f4;&#x7ed5;&#x4e00;&#x90e8;&#x4ee5;&#x65e5;&#x5e38;&#x751f;&#x6d3b;&#x4e2d;&#x7684;&#x610f;&#x5916;&#x3001;&#x8bef;&#x4f1a;&#x4e0e;&#x5c34;&#x5c2c;&#x77ac;&#x95f4;&#x4e3a;&#x5207;&#x5165;&#x70b9;&#x7684;AI&#x52a8;&#x753b;&#x77ed;&#x5267;&#x9879;&#x76ee;&#xff0c;&#x5b8c;&#x6210;&#x4e86;&#x4ece;&#x6545;&#x4e8b;&#x521b;&#x610f;&#x3001;&#x89d2;&#x8272;&#x4e0e;&#x5206;&#x955c;&#x8bbe;&#x8ba1;&#xff0c;&#x5230;AI&#x753b;&#x9762;&#x751f;&#x6210;&#x3001;&#x52a8;&#x753b;&#x5448;&#x73b0;&#x53ca;&#x540e;&#x671f;&#x526a;&#x8f91;&#x7684;&#x7cfb;&#x5217;&#x5316;&#x5236;&#x4f5c;&#x3002;</p><ul><li>STORY CONCEPT</li><li>CHARACTER DESIGN</li><li>AI MOTION</li><li>POST EDIT</li></ul></div>
</div><AccordionGallery items={cupPeopleProjects} defaultIndex={2} expandRatio={.52} trigger="hover" accentColor="#ffffff" overlayColor="#060010" textColor="#ffffff" grayscale showLabels duration={.6} ease="power3.out" parallax={.5} tilt={8} stagger={.06} height={460} gap={10} radius={16} orientation="horizontal" onItemClick={setSelectedProject} />{selectedProject && <ShortDramaModal project={selectedProject} onClose={() => setSelectedProject(null)} />}</section>
}
function Projects() {
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const openVideo = project => setSelectedVideo({ label: `${project.category} / FILM ${project.number}`, video: project.video })
  const openImage = (project, image, imageNumber) => setSelectedImage({ label: `${project.category} / VISUAL ${imageNumber}`, image })

  return <section id="projects" className="projects culture-projects">
    <header className="culture-projects-heading"><span>SELECTED WORK / CULTURAL VISUAL SERIES</span><h2>&#x4e2d;&#x56fd;&#x98ce;<br /><em>&#x4f20;&#x7edf;&#x6587;&#x5316;&#x7cfb;&#x5217;</em></h2><p>Two AI visual projects that translate traditional stories, materials, and cultural imagination into contemporary moving images.</p></header>
    <div className="culture-project-list">{cultureProjects.map(project => <article className="culture-project" key={project.number}>
      <div className="culture-project-intro"><span>{project.number}</span><div><small>{project.category}</small><h3 dangerouslySetInnerHTML={{ __html: project.title }} />{project.award && <p className="culture-project-award"><span>AWARD / SELECTED RECOGNITION</span><em dangerouslySetInnerHTML={{ __html: project.award }} /></p>}<p>AI VISUAL DEVELOPMENT / MOTION / EDIT</p></div><button onClick={() => openVideo(project)}>VIEW FILM <ArrowUpRight size={17} /></button></div>
      <div className={`culture-project-media culture-project-media-${project.number}`}>
        <button className="culture-media-frame culture-video-frame culture-media-action" type="button" onClick={() => openVideo(project)} aria-label={`Play ${project.category} full video`}><InViewLoopVideo src={project.video} poster={project.poster} rootMargin={project.number === '02' ? '720px 0px' : '180px 0px'} /><span className="culture-media-action-label">PLAY FULL VIDEO <ArrowUpRight size={15} /></span></button>
        <button className="culture-media-frame culture-cover-frame culture-cover-primary culture-media-action" type="button" onClick={() => openImage(project, project.covers[0], '01')} aria-label={`View ${project.category} image 1`}><img src={project.covers[0]} alt={`${project.category} supporting visual 1`} /><span className="culture-media-action-label">VIEW IMAGE <ArrowUpRight size={15} /></span></button>
        <button className="culture-media-frame culture-cover-frame culture-cover-secondary culture-media-action" type="button" onClick={() => openImage(project, project.covers[1], '02')} aria-label={`View ${project.category} image 2`}><img src={project.covers[1]} alt={`${project.category} supporting visual 2`} /><span className="culture-media-action-label">VIEW IMAGE <ArrowUpRight size={15} /></span></button>
        {project.covers[2] && <button className="culture-media-frame culture-cover-frame culture-cover-tertiary culture-media-action" type="button" onClick={() => openImage(project, project.covers[2], '03')} aria-label={`View ${project.category} image 3`}><img src={project.covers[2]} alt={`${project.category} supporting visual 3`} /><span className="culture-media-action-label">VIEW IMAGE <ArrowUpRight size={15} /></span></button>}
      </div>
    </article>)}</div>
    {selectedVideo && <ShortDramaModal project={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    {selectedImage && <ImagePreviewModal project={selectedImage} onClose={() => setSelectedImage(null)} />}
  </section>
}function FifiGia() {
  const [selectedProject, setSelectedProject] = useState(null)
  return <section id="fifi-gia" className="fifi-gia"><div className="fifi-gia-heading"><div className="fifi-gia-kicker"><span>03 / IP ACCOUNT</span><span>CHARACTER 璺?CONTENT 璺?VISUAL WORLD</span></div><div className="fifi-gia-heading-content"><h2><span>fifi_Gia</span><em>IP &#x8d26;&#x53f7;</em></h2><div className="fifi-gia-copy"><span>&#x9879;&#x76ee;&#x4ecb;&#x7ecd; / IP ACCOUNT</span><p>fifi_Gia &#x662f;&#x4ee5;&#x89d2;&#x8272;&#x4eba;&#x8bbe;&#x4e0e;&#x89c6;&#x89c9;&#x98ce;&#x683c;&#x4e3a;&#x6838;&#x5fc3;&#x7684; AI IP &#x8d26;&#x53f7;&#x7cfb;&#x5217;&#x5b9e;&#x8df5;&#x3002;&#x901a;&#x8fc7;&#x8fde;&#x7eed;&#x6027;&#x7684;&#x5185;&#x5bb9;&#x521b;&#x4f5c;&#xff0c;&#x5c06;&#x4eba;&#x7269;&#x5f62;&#x8c61;&#x3001;&#x77ed;&#x7247;&#x53d9;&#x4e8b;&#x4e0e;&#x793e;&#x4ea4;&#x5a92;&#x4f53;&#x89c6;&#x89c9;&#x878d;&#x5408;&#xff0c;&#x5efa;&#x7acb;&#x5177;&#x6709;&#x8bc6;&#x522b;&#x5ea6;&#x7684; IP &#x5185;&#x5bb9;&#x4e16;&#x754c;&#x3002;</p></div></div></div><CircularGallery items={fifiGiaProjects} bend={3} textColor="#ffffff" borderRadius={0.1} scrollEase={0.09} font="bold 30px Orbitron" scrollSpeed={1.3} onItemClick={setSelectedProject} />{selectedProject && <ShortDramaModal project={selectedProject} onClose={() => setSelectedProject(null)} />}</section>
}
function AdvertisingFilms() {
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const projectDescription = '\u8D1F\u8D23 2 \u652F\u300ASeaGames\u300B\u5B98\u65B9\u4EA7\u54C1\u767B\u5F55\u6CE8\u518C\u9875\u9762\u914D\u5957\u5BA3\u4F20\u89C6\u9891\u7684\u5168\u6D41\u7A0B\u5236\u4F5C\uFF0C\u4F5C\u4E3A\u9875\u9762\u9644\u5C5E\u7269\u6599\u5D4C\u5165\u4F01\u4E1A\u6B63\u5F0F\u9879\u76EE\u767B\u5F55\u6CE8\u518C\u9875\u4FA7\u8FB9\uFF0C\u5DF2\u4E0A\u7EBF\u843D\u5730\u4F7F\u7528\u3002'
  return <section id="advertising" className="advertising-films"><div className="advertising-heading"><div className="advertising-kicker"><span>04 / SELECTED WORK</span><span>COMMERCIAL / SOCIAL MEDIA / VISUAL CAMPAIGN</span></div><div className="advertising-heading-content"><h2><span>&#x5E7F;&#x544A;</span><em>&#x5BA3;&#x4F20;&#x7247;&#x7CFB;&#x5217;</em></h2><div className="advertising-copy"><span>PROJECT INTRODUCTION / ADVERTISING FILMS</span><p>&#x56F4;&#x7ED5;&#x54C1;&#x724C;&#x793E;&#x5A92;&#x4F20;&#x64AD;&#x4E0E;&#x4EA7;&#x54C1;&#x5F62;&#x8C61;&#x5C55;&#x793A;&#xFF0C;&#x8FD0;&#x7528; AI &#x89C6;&#x89C9;&#x751F;&#x6210;&#x3001;&#x52A8;&#x6001;&#x8BBE;&#x8BA1;&#x4E0E;&#x526A;&#x8F91;&#x8282;&#x594F;&#xFF0C;&#x5B8C;&#x6210;&#x4ECE;&#x521B;&#x610F;&#x6784;&#x601D;&#x5230;&#x5F71;&#x50CF;&#x5448;&#x73B0;&#x7684;&#x7CFB;&#x5217;&#x5316;&#x521B;&#x4F5C;&#x3002;</p></div></div></div><div className="seagames-introduction"><span>FEATURED PROJECT / SEAGAMES</span><p>{projectDescription}</p></div><div className="seagames-feature-grid">{seaGamesProjects.map(project => <article className="seagames-feature" key={project.video}><button className="seagames-feature-video" type="button" onClick={() => setSelectedProject(project)} aria-label={`Open ${project.label}`}><InViewLoopVideo src={project.video} /><span className="seagames-video-overlay" /><span className="seagames-video-meta"><small>OFFICIAL PRODUCT FILM / {project.number}</small><strong>{project.label}</strong><i>CLICK TO VIEW FULL FILM <ArrowUpRight size={15} /></i></span></button><button className="seagames-feature-side" type="button" onClick={() => setSelectedImage(project)} aria-label={`View ${project.label} supporting visual`}><img src={project.image} alt={`${project.label} supporting visual`} loading="lazy" /><span>PAGE SUPPORTING VISUAL / {project.number}</span><b>VIEW IMAGE <ArrowUpRight size={13} /></b></button></article>)}</div>{selectedProject && <ShortDramaModal project={selectedProject} onClose={() => setSelectedProject(null)} />}{selectedImage && <ImagePreviewModal project={selectedImage} onClose={() => setSelectedImage(null)} />}</section>
}function JiangxingShowcase() {
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  return <section id="jiangxing-laptop" className="jiangxing-showcase"><div className="jiangxing-showcase-head"><div><span>05 / FEATURED ADVERTISING CASE</span><h2>&#x300a;&#x5c06;&#x661f;&#x300b;<em>&#x7b14;&#x8bb0;&#x672c;&#x5e7f;&#x544a;</em></h2></div><p><b>&#x9879;&#x76ee;&#x7b80;&#x4ecb; / PROJECT SYNOPSIS</b>{jiangxingProject.description}</p></div><div className="jiangxing-showcase-grid"><button className="jiangxing-video" type="button" onClick={() => setSelectedProject(jiangxingProject)} aria-label="Play Jiangxing laptop advertising film"><InViewLoopVideo src={jiangxingProject.video} rootMargin="300px 0px" /><span className="jiangxing-video-scrim" /><span className="jiangxing-video-action"><small>JIANXING LAPTOP / OFFICIAL FILM</small><strong>&#x64ad;&#x653e;&#x5b8c;&#x6574;&#x5e7f;&#x544a;</strong><i>PLAY FULL FILM <ArrowUpRight size={17} /></i></span></button><button className="jiangxing-poster" type="button" onClick={() => setSelectedImage(jiangxingProject)} aria-label="View Jiangxing laptop advertising poster"><img src={jiangxingProject.image} alt="Jiangxing laptop advertising poster" loading="lazy" /><span><small>KEY VISUAL / POSTER</small><strong>&#x70b9;&#x51fb;&#x653e;&#x5927;&#x6d77;&#x62a5;</strong><i>VIEW POSTER <ArrowUpRight size={15} /></i></span></button></div>{selectedProject && <ShortDramaModal project={selectedProject} onClose={() => setSelectedProject(null)} />}{selectedImage && <ImagePreviewModal project={selectedImage} onClose={() => setSelectedImage(null)} />}</section>
}function CommercialPractice() {
  const [selectedProject, setSelectedProject] = useState(null)
  const transforms = ['rotate(-7deg) translateX(-230px)', 'rotate(-2deg) translateX(-75px)', 'rotate(3deg) translateX(75px)', 'rotate(8deg) translateX(230px)']
  return <section id="commercial-practice" className="commercial-practice"><div className="commercial-practice-head"><span>06 / FINAL SHOWCASE</span><h2>&#x5546;&#x4e1a;&#x5e7f;&#x544a;<em>&#x7ec3;&#x4e60;</em></h2><p>&#x66f4;&#x591a;&#x54c1;&#x724c;&#x4f20;&#x64ad;&#x4e0e;&#x793e;&#x5a92;&#x89c6;&#x89c9;&#x77ed;&#x7247;&#xff0c;&#x70b9;&#x51fb;&#x5361;&#x7247;&#x53ef;&#x67e5;&#x770b;&#x5b8c;&#x6574;&#x89c6;&#x9891;&#x3002;</p></div><div className="advertising-secondary commercial-practice-content"><BounceCards className="advertising-bounce-cards" items={advertisingProjects} containerWidth={1000} containerHeight={500} animationDelay={.6} animationStagger={.12} transformStyles={transforms} enableHover onItemClick={setSelectedProject} /></div>{selectedProject && <ShortDramaModal project={selectedProject} onClose={() => setSelectedProject(null)} />}</section>
}function Hero({ onReady }) {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [cardSequence, setCardSequence] = useState('dormant')
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    const duration = 1750
    const startedAt = performance.now()
    let frameId
    const tick = now => {
      const elapsed = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - elapsed, 3)
      setProgress(Math.round(eased * 100))
      if (elapsed < 1) frameId = requestAnimationFrame(tick)
      else window.setTimeout(() => { setReady(true); onReady?.() }, 180)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    const unfoldTimer = window.setTimeout(() => setCardSequence('unfolding'), 1380)
    const settleTimer = window.setTimeout(() => setCardSequence('settled'), 2480)
    return () => {
      window.clearTimeout(unfoldTimer)
      window.clearTimeout(settleTimer)
    }
  }, [ready])

  return <section id="home" className={`reference-hero ${ready ? 'is-ready' : ''}`}>
    <WebThreads color1="#5227FF" color2="#FF9FFC" color3="#FFFFFF" speed={0.2} threadCount={6} frequency={5} spread={0.18} taper={1} position={0.5} fanMode="center" glow={0.02} falloff={0.6} thickness={1.1} brightness={0.6} opacity={1} mirror shimmer={false} grain grainIntensity={0.05} mouseInteraction mouseStrength={0.3} />
    <div className="reference-noise" />
    <div className="reference-orb reference-orb-left" />
    <div className="reference-orb reference-orb-right" />
    <div className="reference-grid" />
    <div className={`hero-loader ${ready ? 'is-hidden' : ''}`} aria-hidden={ready}>
      <span>{progress}%</span>
      <div className="hero-loader-rule" />
    </div>

    <div className="reference-hero-copy">
      <div className="reference-eyebrow"><span /> VISUAL DESIGNER <i /> AI CREATOR</div>
      <h1><span className="title-line">&#x8bbe;&#x8ba1;&#x6ca1;&#x6709;&#x8fb9;&#x754c;</span><span className="title-line title-accent">AI &#x9a71;&#x52a8;&#x89c6;&#x89c9;&#x4f53;&#x9a8c;</span></h1>
      <p>Blending image, motion and brand thinking<br />to create memorable digital expressions.</p>
      <button className="reference-work-link" onClick={() => go('projects')}>EXPLORE SELECTED WORK <ArrowUpRight size={17} /></button>
    </div>
    <div className={`reference-card-stage cards-${cardSequence}`} aria-label="Selected project previews">
      <div className="reference-card-arc" />
      {heroProjects.map((project, index) => <BorderGlow key={project.file} edgeSensitivity={25} glowColor="40 80 80" backgroundColor="#120F17" borderRadius={26} glowRadius={45} glowIntensity={1.2} coneSpread={35} animated={false} colors={["#c084fc", "#f472b6", "#38bdf8"]}><button className={`reference-project-card reference-project-card-${index}`} onClick={() => go(project.target)} aria-label={`View ${project.title} project`}>
        {project.cover ? <img className="reference-center-cover" src={project.cover} alt={`${project.title} project cover`} /> : <video src={`/videos/${encodeURIComponent(project.file)}`} autoPlay muted loop playsInline preload="metadata" />}
        <span className="reference-card-sheen" />
        <span className="reference-card-meta"><small>{project.type}</small><strong>{project.title}</strong><i>0{index + 1}</i><em className="reference-card-action">ENTER PROJECT <ArrowUpRight size={13} /></em></span>
      </button></BorderGlow>)}
    </div>
    <div className="reference-footer-note"><span>CREATIVE DIRECTION / AI VISUAL / BRAND DESIGN</span><button onClick={() => go('about')}>SCROLL TO EXPLORE <span>&darr;</span></button></div>
  </section>
}
function SiteNav({ isVisible, activeNav = 'home', theme = 'violet', onContact }) {
  const navItems = [
    { id: 'home', label: 'HOME \u9996\u9875', href: '#home' },
    { id: 'about', label: 'PROFILE \u4E2A\u4EBA\u7B80\u4ECB', href: '#about' },
    { id: 'projects', label: 'WORK \u4F5C\u54C1\u96C6', href: '#music-mv' },
  ]
  return <header className={`reference-nav ${isVisible ? 'is-visible' : ''}`} data-theme={theme}><a className="reference-brand" href="#home" aria-label="Yang Zengyan home"><img src="/mark.svg" alt="" /><span>YANG ZENGYAN</span></a><nav aria-label="Primary navigation">{navItems.map(item => <a key={item.id} href={item.href} className={activeNav === item.id ? 'is-active' : ''} aria-current={activeNav === item.id ? 'page' : undefined}>{item.label}</a>)}</nav><button className="reference-nav-cta" type="button" onClick={onContact}>\u8054\u7CFB\u6211; <ArrowUpRight size={15} /></button></header>
}function CinematicRail({ railRef, theme, activeIndex, isVisible }) {
  const nodes = ['HOME', 'PROFILE', 'MUSIC', 'DRAMA', 'CULTURE', 'IP', 'AD', 'CASE', 'MORE']
  return <div ref={railRef} className={`cinematic-rail ${isVisible ? 'is-visible' : ''}`} data-theme={theme} aria-hidden="true"><span className="cinematic-rail-track" /><span className="cinematic-rail-fill" /><span className="cinematic-rail-orb" />{nodes.map((label, index) => <span key={label} className={`cinematic-rail-node ${index === activeIndex ? 'is-active' : ''} ${index < activeIndex ? 'is-passed' : ''}`} style={{ '--rail-node-position': `${(index / (nodes.length - 1)) * 100}%` }}><i /><b>{label}</b></span>)}</div>
}
function App() {
  const [navVisible, setNavVisible] = useState(false)
  const [activeTheme, setActiveTheme] = useState('violet')
  const [activeNav, setActiveNav] = useState('home')
  const [activeIndex, setActiveIndex] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const railRef = useRef(null)

  useEffect(() => {
    const themes = {
      home: { theme: 'violet', nav: 'home' },
      about: { theme: 'blue', nav: 'about' },
      'music-mv': { theme: 'violet', nav: 'projects' },
      price: { theme: 'lilac', nav: 'price' },
      projects: { theme: 'gold', nav: 'projects' },
      'fifi-gia': { theme: 'rose', nav: 'projects' },
      advertising: { theme: 'coral', nav: 'projects' },
      'jiangxing-laptop': { theme: 'electric', nav: 'projects' },
      'commercial-practice': { theme: 'magenta', nav: 'projects' },
    }
    const allSections = [...document.querySelectorAll('main > section')]
    const flowSections = allSections.filter(section => section.id !== 'home')
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let previousScroll = window.scrollY

    allSections.forEach((section, index) => section.dataset.cinematicIndex = String(index))
    flowSections.forEach(section => {
      section.classList.add('page-flow-section', 'cinematic-section')
      section.dataset.theme = themes[section.id]?.theme || 'violet'
      let layer = 0
      ;[...section.children].forEach(child => {
        if (child.matches('.marquee-light-pillar, .about-profile-stars')) return
        child.dataset.cinematicLayer = String(layer)
        layer += 1
      })
    })

    let revealObserver
    if (prefersReducedMotion) {
      flowSections.forEach(section => section.classList.add('is-flow-visible'))
    } else {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-flow-visible')
          revealObserver.unobserve(entry.target)
        })
      }, { rootMargin: '0px 0px -9% 0px', threshold: .07 })
      flowSections.forEach(section => revealObserver.observe(section))
    }

    let animationFrame = null
    const updateScene = () => {
      animationFrame = null
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1)
      const direction = window.scrollY >= previousScroll ? 'down' : 'up'
      previousScroll = window.scrollY
      railRef.current?.style.setProperty('--rail-position', `${progress * 100}%`)
      document.documentElement.dataset.scrollDirection = direction

      const viewportMiddle = window.innerHeight * .5
      let closestSection = null
      let closestDistance = Number.POSITIVE_INFINITY
      allSections.forEach(section => {
        const bounds = section.getBoundingClientRect()
        const centerOffset = ((bounds.top + bounds.bottom) * .5 - viewportMiddle) / Math.max(window.innerHeight, 1)
        const shift = Math.min(Math.max(centerOffset, -1), 1)
        const distanceFromCenter = Math.min(Math.abs(centerOffset), 1.25)
        const focus = Math.min(Math.max(1 - distanceFromCenter * .82, 0), 1)
        const cameraScale = 1 - Math.min(distanceFromCenter * .035, .045)
        const cameraY = Math.min(Math.max(centerOffset * 24, -30), 30)
        const cameraBrightness = .72 + focus * .28
        const cameraBlur = Math.min((1 - focus) * .7, .85)
        section.style.setProperty('--cinematic-focus', focus.toFixed(3))
        section.style.setProperty('--cinematic-scale', cameraScale.toFixed(4))
        section.style.setProperty('--cinematic-camera-y', `${cameraY.toFixed(2)}px`)
        section.style.setProperty('--cinematic-brightness', cameraBrightness.toFixed(3))
        section.style.setProperty('--cinematic-camera-blur', `${cameraBlur.toFixed(2)}px`)
        if (section.classList.contains('cinematic-section')) {
          ;[...section.querySelectorAll(':scope > [data-cinematic-layer]')].forEach((child, layer) => {
            const drift = shift * (13 + Math.min(layer, 3) * 9)
            child.style.setProperty('--cinematic-drift', `${drift.toFixed(2)}px`)
            child.style.setProperty('--cinematic-scale', `${(.986 + focus * .014).toFixed(4)}`)
          })
        }
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return
        const distance = Math.abs((bounds.top + bounds.bottom) * .5 - viewportMiddle)
        if (distance < closestDistance) { closestDistance = distance; closestSection = section }
      })
      if (!closestSection) return
      const current = themes[closestSection.id] || themes.home
      const index = allSections.indexOf(closestSection)
      setActiveTheme(previous => previous === current.theme ? previous : current.theme)
      setActiveNav(previous => previous === current.nav ? previous : current.nav)
      setActiveIndex(previous => previous === index ? previous : index)
      flowSections.forEach(section => section.classList.toggle('is-cinematic-active', section === closestSection))
    }
    const onScroll = () => { if (!animationFrame) animationFrame = requestAnimationFrame(updateScene) }
    updateScene()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      revealObserver?.disconnect()
      if (animationFrame) cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return <><SiteNav isVisible={navVisible} activeNav={activeNav} theme={activeTheme} onContact={() => setContactOpen(true)} /><CinematicRail railRef={railRef} theme={activeTheme} activeIndex={activeIndex} isVisible={navVisible} /><div className="cinematic-atmosphere" data-theme={activeTheme} aria-hidden="true" /><main><Hero onReady={() => setNavVisible(true)} /><About /><Marquee /><Services /><Projects /><FifiGia /><AdvertisingFilms /><JiangxingShowcase /><CommercialPractice /></main>{contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}</>
}createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
