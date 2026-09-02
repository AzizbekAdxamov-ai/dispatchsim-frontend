import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import { roleLabel, sortRoles } from '../data/roleRoutes'
import Toggle from '../components/Toggle'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
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

export default function Settings() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const name = user?.name ?? ''
  const company = user?.company ?? ''

  const [notif, setNotif] = useState({
    email: true,
    sms: false,
    push: true,
    brokerMessages: true,
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-head-plain">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your profile, preferences and account</div>
      </div>

      <div className="settings-grid">
        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Profile</div></div>
            <div className="settings-body">
              <div className="settings-profile-row">
                <div className="settings-avatar">{initials(name)}</div>
                <div className="settings-profile-meta">
                  <div className="settings-profile-name">{name || 'Unnamed user'}</div>
                  <div className="settings-profile-role">{roleLabel(user?.activeRole)}{company ? ' · ' + company : ''}</div>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="settings-name">Full name</label>
                <input id="settings-name" value={name} readOnly placeholder="Full name" />
              </div>
              <div className="settings-field">
                <label htmlFor="settings-company">Company / team name</label>
                <input id="settings-company" value={company} readOnly placeholder="Company name" />
              </div>
              <div className="settings-field">
                <label>Workspaces</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sortRoles(user?.roles).map((key) => (
                    <span
                      key={key}
                      className={'badge ' + (key === user?.activeRole ? 'done' : 'neutral')}
                    >
                      <span className="dot"></span>
                      {roleLabel(key)}
                    </span>
                  ))}
                </div>
                <div className="settings-row-desc">
                  Your administrator decides which workspaces are open to you. Switch between them from the top bar.
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Password</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="settings-current-pw">Current password</label>
                <input id="settings-current-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="settings-field">
                <label htmlFor="settings-new-pw">New password</label>
                <input id="settings-new-pw" type="password" placeholder="••••••••" />
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
            <div className="panel-head"><div className="panel-title">Notifications</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Email alerts</div>
                  <div className="settings-row-desc">Delay, HOS and document alerts by email</div>
                </div>
                <Toggle checked={notif.email} onChange={(v) => setNotif((n) => ({ ...n, email: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">SMS alerts</div>
                  <div className="settings-row-desc">Critical alerts only, sent by text message</div>
                </div>
                <Toggle checked={notif.sms} onChange={(v) => setNotif((n) => ({ ...n, sms: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Push notifications</div>
                  <div className="settings-row-desc">Real-time alerts inside the app</div>
                </div>
                <Toggle checked={notif.push} onChange={(v) => setNotif((n) => ({ ...n, push: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Broker messages</div>
                  <div className="settings-row-desc">Notify when a broker sends a new message</div>
                </div>
                <Toggle checked={notif.brokerMessages} onChange={(v) => setNotif((n) => ({ ...n, brokerMessages: v }))} />
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
