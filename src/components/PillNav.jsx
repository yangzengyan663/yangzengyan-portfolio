import { useState } from 'react'
import './PillNav.css'

export default function PillNav({ logo = '/mark.svg', logoAlt = 'Yang Zengyan Logo', items = [], activeHref = '#home', className = '', actionLabel = 'CONTACT ME', actionHref = '#contact' }) {
  const [active, setActive] = useState(activeHref)
  const [mobileOpen, setMobileOpen] = useState(false)
  const go = (event, href) => { event.preventDefault(); setActive(href); setMobileOpen(false); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }) }
  return <div className={`pill-nav-container ${className} ${mobileOpen ? 'is-open' : ''}`}>
    <nav className="pill-nav" aria-label="Primary navigation">
      <a className="pill-logo" href="#home" onClick={event => go(event, '#home')}><img src={logo} alt={logoAlt} /><span>YANG ZENGYAN</span></a>
      <ul className="pill-list desktop-only">{items.map(item => <li key={item.href}><a className={`pill ${active === item.href ? 'is-active' : ''}`} href={item.href} onClick={event => go(event, item.href)}><span>{item.label}</span></a></li>)}</ul>
      <a className="pill-action desktop-only" href={actionHref} onClick={event => go(event, actionHref)}>{actionLabel}</a>
      <button className="mobile-menu-button mobile-only" onClick={() => setMobileOpen(value => !value)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}><i /><i /></button>
    </nav>
    <div className="mobile-menu-popover mobile-only"><ul>{[...items, { href: actionHref, label: actionLabel }].map(item => <li key={item.href}><a href={item.href} onClick={event => go(event, item.href)}>{item.label}</a></li>)}</ul></div>
  </div>
}
