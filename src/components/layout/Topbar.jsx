import { Moon, Sun, MapTrifold, Package, MagnifyingGlass } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import CashChip from './CashChip'
import AlertsBell from './AlertsBell'
import './Topbar.css'

// The screens dispatch opens all day, one click from any page. Lives here
// (not navSections.js) on purpose: these are shortcuts, not structure --
// the sidebar stays the single source of the workspace's navigation, and
// this list never grows into a duplicate of it.
const QUICK_LINKS = [
  { to: '/map', icon: MapTrifold, label: 'Map' },
  { to: '/loads', icon: Package, label: 'Loads' },
  { to: '/load-board', icon: MagnifyingGlass, label: 'Load Board' },
]

export default function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {/* Where the timezone clocks used to sit. NavLink, not Link: the
          chip you are on reads as selected, not just tappable. */}
      <nav className="topbar-links" aria-label="Quick links">
        {QUICK_LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'topbar-link' + (isActive ? ' active' : '')}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="topbar-spacer"></div>
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
