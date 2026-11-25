import { Moon, Sun, MapTrifold, Package, MagnifyingGlass, List } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import CashChip from './CashChip'
import AlertsBell from './AlertsBell'
import ZoneClocks from './ZoneClocks'
import { useSidebar } from './SidebarContext'
// The order lives in its own plain-.js module (quickLinks.js) so
// node:test can pin it -- node:test cannot import JSX, and an untestable
// rule is a rule that is quietly reordered. Icons attach here, by `to`.
import { QUICK_LINKS } from './quickLinks'
import './Topbar.css'

const LINK_ICONS = {
  '/loads': Package,
  '/load-board': MagnifyingGlass,
  '/map': MapTrifold,
}

// Words on the bar that are not page titles. Props, so a screen can reword them.
export const TOPBAR_COPY = {
  openMenu: 'Open menu',
  quickLinks: 'Quick links',
  toggleTheme: 'Toggle theme',
}

export default function Topbar({ title, copy = TOPBAR_COPY }) {
  const { theme, toggleTheme } = useTheme()
  const { drawerOpen, openDrawer } = useSidebar()

  return (
    <div className="topbar">
      {/* Only drawn below 768px, where the sidebar is not in the page. */}
      <button
        type="button"
        className="icon-btn topbar-menu-btn"
        aria-label={copy.openMenu}
        aria-expanded={drawerOpen}
        aria-controls="app-sidebar"
        onClick={openDrawer}
      >
        <List size={20} aria-hidden="true" />
      </button>
      <div className="topbar-title" title={title}>{title}</div>
      {/* NavLink, not Link: the chip you are on reads as selected, not
          just tappable. */}
      <nav className="topbar-links" aria-label={copy.quickLinks}>
        {QUICK_LINKS.map(({ to, label }) => {
          const Icon = LINK_ICONS[to] ?? Package
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 'topbar-link' + (isActive ? ' active' : '')}
              aria-label={label}
              title={label}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="topbar-link-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="topbar-spacer"></div>
      {/* Back on 2026-10-01, with the day and the right daylight-time
          names -- see utils/zoneClocks.js for why they left and why they
          came back. On the right, so the quick links keep their place. */}
      <ZoneClocks />
      {/* Back after a day out: the balance is the one number this project
          insists stays in front of whoever is spending it, and CashChip's
          own header says why. Leaving it out made the component dead code
          and took the number off every page at the same time. */}
      <CashChip />
      <div className="topbar-icons">
        <button className="icon-btn topbar-theme-btn" onClick={toggleTheme} aria-label={copy.toggleTheme}>
          {theme === 'dark' ? <Moon size={17} weight="fill" /> : <Sun size={17} weight="fill" />}
        </button>
        {/* The Messages button that used to sit here did nothing: no inbox
            exists, and a control that looks clickable and is not teaches
            the student to distrust the rest of the toolbar. Removed rather
            than left in place, the same way LoadDetail's dead "Message
            driver" and "Call broker" buttons were. */}
        <AlertsBell />
      </div>
    </div>
  )
}
