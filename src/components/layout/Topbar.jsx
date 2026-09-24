import { Moon, Sun } from '@phosphor-icons/react'
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
