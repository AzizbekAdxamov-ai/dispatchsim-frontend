import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher'
import ChangePasswordPanel from '../components/settings/ChangePasswordPanel'
import { PASSWORD_COPY } from '../data/passwordCopy'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Settings.css'

const WORKSPACE_COPY = {
  title: 'Workspaces',
  note: 'Choosing one opens that workspace.',
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function FleetSettings() {
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
                  <div className="settings-profile-name">{name || 'No name set'}</div>
                  <div className="settings-profile-role">Fleet manager{company ? ' · ' + company : ''}</div>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="fs-name">Full name</label>
                <input id="fs-name" value={name} readOnly placeholder="Full name" />
              </div>
              <div className="settings-field">
                <label htmlFor="fs-company">Company name</label>
                <input id="fs-company" value={company} readOnly placeholder="Company name" />
              </div>
            </div>
          </div>

          <ChangePasswordPanel idPrefix="fs" copy={PASSWORD_COPY} />
        </div>

        <div>
          {hasSeveralWorkspaces && (
            <div className="panel">
              <div className="panel-head"><div className="panel-title">{WORKSPACE_COPY.title}</div></div>
              <div className="settings-body">
                <WorkspaceSwitcher />
                <div className="settings-row-desc">{WORKSPACE_COPY.note}</div>
              </div>
            </div>
          )}
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
