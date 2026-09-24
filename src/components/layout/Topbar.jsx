import { Moon, Sun, MapTrifold } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import CashChip from './CashChip'
import AlertsBell from './AlertsBell'
import './Topbar.css'

export default function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {/* Where the timezone clocks used to sit: the fleet map is the one
          screen dispatch opens all day, so it gets the top bar instead --
          one click from every page, the same spot the clocks held. */}
      <Link to="/tracking" className="topbar-map-btn">
        <MapTrifold size={15} aria-hidden="true" />
        <span>Map</span>
      </Link>
      <div className="topbar-spacer"></div>
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
