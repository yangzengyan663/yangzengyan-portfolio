import { siteBase } from './assetPaths'
import { Component, useEffect } from 'react'

// An optional effect or a failed dynamic import must never unmount the portfolio.
export default class VisualBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children }
}

export function PortfolioRecovery() {
  useEffect(() => { window.__portfolioOpening?.fail() }, [])
  return <main className="portfolio-error" role="alert">
    <h1>页面加载失败</h1>
    <p>请重新加载以打开完整作品集。</p>
    <p><a href={siteBase}>重新加载</a></p>
  </main>
}
