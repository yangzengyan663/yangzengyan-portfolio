import { Component } from 'react'

// An optional effect or a failed dynamic import must never unmount the portfolio.
export default class VisualBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children }
}

export function PortfolioRecovery() {
  return <main className="portfolio-recovery">
    <p>AIGC VISUAL DESIGNER</p><h1>杨增延 · 影像作品集</h1>
    <p>完整页面暂未加载，仍可直接观看作品或联系我。</p>
    <nav aria-label="直接观看作品">
      <a href="/media/chinese-culture/jinshan.mp4?v=20261112">《金缮》</a>
      <a href="/media/chinese-culture/new-li-bai.mp4?v=20261112">《迷雾中的古蜀》</a>
      <a href="/media/digital-human-series/tjax-02.mp4?v=20261112">Quiet Mind · 音乐 MV</a>
      <a href="/media/advertising-series/seagames-01.mp4?v=20261112">SeaGames · 产品宣传片</a>
      <a href="/media/jiangxing-laptop/jiangxing-laptop-ad.mp4?v=20261112">《将星》广告短片</a>
      <a href="/media/fifi-gia/ip-3.mp4?v=20261112">fifi_Gia · 虚拟角色影像</a>
    </nav>
    <p><a href="mailto:2206573527@qq.com">联系我</a> · <a href="/">重新打开完整作品集</a></p>
  </main>
}
