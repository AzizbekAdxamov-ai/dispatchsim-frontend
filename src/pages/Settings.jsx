import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import { roleLabel, sortRoles } from '../data/roleRoutes'
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher'
import CarrierPanel from '../components/settings/CarrierPanel'
import ChangePasswordPanel from '../components/settings/ChangePasswordPanel'
import { PASSWORD_COPY } from '../data/passwordCopy'
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

const SETTINGS_EMAIL_COPY = { label: 'Sign-in email' }

const WORKSPACE_NOTE = {
  single: 'Your administrator decides which workspaces are open to you.',
  several: 'Choosing one opens that workspace.',
}

export default function Settings({ emailCopy = SETTINGS_EMAIL_COPY }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const name = user?.name ?? ''
  const company = user?.company ?? ''
  const hasSeveralWorkspaces = (user?.roles?.length ?? 0) >= 2

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
                <label htmlFor="settings-email">{emailCopy.label}</label>
                <input id="settings-email" type="email" value={user?.email ?? ''} readOnly />
              </div>
              <div className="settings-field">
                <label htmlFor="settings-company">Company / team name</label>
                <input id="settings-company" value={company} readOnly placeholder="Company name" />
              </div>
              <div className="settings-field">
                <label>Workspaces</label>
                {hasSeveralWorkspaces ? (
                  <WorkspaceSwitcher />
                ) : (
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
                )}
                <div className="settings-row-desc">
                  {hasSeveralWorkspaces ? WORKSPACE_NOTE.several : WORKSPACE_NOTE.single}
                </div>
              </div>
            </div>
          </div>

          <CarrierPanel isAdmin={Boolean(user?.isAdmin)} />

          <ChangePasswordPanel idPrefix="settings" copy={PASSWORD_COPY} />
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
