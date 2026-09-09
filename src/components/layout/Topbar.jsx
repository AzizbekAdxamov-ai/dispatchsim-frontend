import { useEffect, useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../../theme/ThemeProvider'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import CashChip from './CashChip'
import AlertsBell from './AlertsBell'
import './Topbar.css'

const ZONES = [
  { label: 'EST — New York', tz: 'America/New_York' },
  { label: 'CST — Chicago', tz: 'America/Chicago' },
  { label: 'PST — Los Angeles', tz: 'America/Los_Angeles' },
]

function formatTime(tz) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(new Date())
}

export default function Topbar({ title }) {
  const [, setTick] = useState(0)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="tz-strip">
        {ZONES.map((zone) => (
          <div className="tz-item" key={zone.tz}>
            <span className="tz-time mono">{formatTime(zone.tz)}</span>
            <span className="tz-zone">{zone.label}</span>
          </div>
        ))}
      </div>
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
