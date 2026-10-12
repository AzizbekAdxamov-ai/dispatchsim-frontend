import { Moon, Sun, MapTrifold, Package, MagnifyingGlass } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import CashChip from './CashChip'
import AlertsBell from './AlertsBell'
import ZoneClocks from './ZoneClocks'
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

export default function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {/* NavLink, not Link: the chip you are on reads as selected, not
          just tappable. */}
      <nav className="topbar-links" aria-label="Quick links">
        {QUICK_LINKS.map(({ to, label }) => {
          const Icon = LINK_ICONS[to] ?? Package
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 'topbar-link' + (isActive ? ' active' : '')}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
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
      <WorkspaceSwitcher />
      <div className="topbar-icons">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
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
