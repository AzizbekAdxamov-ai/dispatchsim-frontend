import { useEffect, useState } from 'react'
import { Moon, Sun, Envelope, Bell } from '@phosphor-icons/react'
import { useTheme } from '../../theme/ThemeProvider'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import CashChip from './CashChip'
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
        <button className="icon-btn" aria-label="Messages">
          <Envelope size={17} />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={17} /><span className="icon-dot"></span>
        </button>
      </div>
    </div>
  )
}
