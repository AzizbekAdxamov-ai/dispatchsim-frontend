import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Settings.css'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function Toggle({ checked, onChange }) {
  return (
    <motion.button
      type="button"
      className={'settings-toggle' + (checked ? ' on' : '')}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      whileTap={{ scale: 0.94 }}
    >
      <span className="settings-toggle-knob" />
    </motion.button>
  )
}

export default function FleetSettings() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const name = user?.name ?? ''
  const company = user?.company ?? ''

  const [thresholds, setThresholds] = useState({
    fuelPct: 30,
    idleHours: 12,
    tireWearPct: 40,
  })

  const [notif, setNotif] = useState({
    maintenanceDue: true,
    lowFuel: true,
    tireWear: true,
    idleTime: false,
    documentExpiry: true,
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-head-plain">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your profile, alert thresholds and notifications</div>
      </div>

      <div className="settings-grid">
        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Profile</div></div>
            <div className="settings-body">
              <div className="settings-profile-row">
                <div className="settings-avatar">{initials(name)}</div>
                <div className="settings-profile-meta">
                  <div className="settings-profile-name">{name || 'No name set'}</div>
                  <div className="settings-profile-role">Fleet manager{company ? ' · ' + company : ''}</div>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="fs-name">Full name</label>
                <input id="fs-name" value={name} readOnly placeholder="John Miller" />
              </div>
              <div className="settings-field">
                <label htmlFor="fs-company">Company name</label>
                <input id="fs-company" value={company} readOnly placeholder="Nova Freight LLC" />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Password</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="fs-current-pw">Current password</label>
                <input id="fs-current-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="settings-field">
                <label htmlFor="fs-new-pw">New password</label>
                <input id="fs-new-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="settings-save-row">
                <button type="button" className="settings-save-btn">Update password</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Appearance</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Theme</div>
                  <div className="settings-row-desc">Switch between dark and light interface</div>
                </div>
                <div className="settings-theme-switch">
                  <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button>
                  <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Alert thresholds</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="fs-fuel-th">Low fuel threshold (%)</label>
                <input
                  id="fs-fuel-th" type="number" min="0" max="100"
                  value={thresholds.fuelPct}
                  onChange={(e) => setThresholds((t) => ({ ...t, fuelPct: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="fs-idle-th">Idle time threshold (hours)</label>
                <input
                  id="fs-idle-th" type="number" min="0"
                  value={thresholds.idleHours}
                  onChange={(e) => setThresholds((t) => ({ ...t, idleHours: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label htmlFor="fs-tire-th">Tire tread threshold (%)</label>
                <input
                  id="fs-tire-th" type="number" min="0" max="100"
                  value={thresholds.tireWearPct}
                  onChange={(e) => setThresholds((t) => ({ ...t, tireWearPct: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Notifications</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Service due</div>
                  <div className="settings-row-desc">Alert when service is coming up or past due</div>
                </div>
                <Toggle checked={notif.maintenanceDue} onChange={(v) => setNotif((n) => ({ ...n, maintenanceDue: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Low fuel</div>
                  <div className="settings-row-desc">Notify when fuel drops below the set threshold</div>
                </div>
                <Toggle checked={notif.lowFuel} onChange={(v) => setNotif((n) => ({ ...n, lowFuel: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Tire tread</div>
                  <div className="settings-row-desc">Alert when tire wear passes the threshold</div>
                </div>
                <Toggle checked={notif.tireWear} onChange={(v) => setNotif((n) => ({ ...n, tireWear: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Extended idle</div>
                  <div className="settings-row-desc">Notify when a truck sits idle longer than the set hours</div>
                </div>
                <Toggle checked={notif.idleTime} onChange={(v) => setNotif((n) => ({ ...n, idleTime: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Document expiry</div>
                  <div className="settings-row-desc">Alert when registration, insurance or other paperwork is close to expiring</div>
                </div>
                <Toggle checked={notif.documentExpiry} onChange={(v) => setNotif((n) => ({ ...n, documentExpiry: v }))} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Account</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Sign out</div>
                  <div className="settings-row-desc">End your session on this device</div>
                </div>
                <button type="button" className="settings-logout-btn" onClick={handleLogout}>Sign out</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
