import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../theme/ThemeProvider'
import { roleLabel, sortRoles } from '../../data/roleRoutes'
import WorkspaceSwitcher from '../layout/WorkspaceSwitcher'
import ChangePasswordPanel from './ChangePasswordPanel'
import { PASSWORD_COPY } from '../../data/passwordCopy'
import '../dashboard/Panel.css'
import '../dashboard/LoadBoard.css'
import '../../pages/PageHeader.css'
import '../../pages/Settings.css'

// The account half of every Settings page: profile, workspaces, password,
// appearance, sign out. Each workspace's page wraps it and adds what only it
// has (carrier details, cost assumptions) through the two extra slots.
// Words arrive in `copy` / `passwordCopy`, so the Academy can speak Uzbek.
export const ACCOUNT_SETTINGS_COPY = {
  title: 'Settings',
  sub: 'Manage your profile, preferences and account',
  profile: 'Profile',
  fullName: 'Full name',
  namePlaceholder: 'Full name',
  email: 'Sign-in email',
  company: 'Company / team name',
  companyPlaceholder: 'Company name',
  workspaces: 'Workspaces',
  workspacesNoteSingle: 'Your administrator decides which workspaces are open to you.',
  workspacesNoteSeveral: 'Choosing one opens that workspace.',
  appearance: 'Appearance',
  theme: 'Theme',
  themeDesc: 'Switch between dark and light interface',
  dark: 'Dark',
  light: 'Light',
  account: 'Account',
  signOut: 'Sign out',
  signOutDesc: 'End your session on this device',
  unnamed: 'Unnamed user',
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

export default function AccountSettings({
  copy = ACCOUNT_SETTINGS_COPY,
  idPrefix,
  roleText,
  passwordCopy = PASSWORD_COPY,
  primaryExtra = null,
  secondaryExtra = null,
}) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const name = user?.name ?? ''
  const company = user?.company ?? ''
  const roles = user?.roles ?? []
  const hasSeveralWorkspaces = roles.length >= 2
  const role = roleText ?? roleLabel(user?.activeRole)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-head-plain">
        <div className="page-title">{copy.title}</div>
        <div className="page-sub">{copy.sub}</div>
      </div>

      <div className="settings-grid">
        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">{copy.profile}</div></div>
            <div className="settings-body">
              <div className="settings-profile-row">
                <div className="settings-avatar">{initials(name)}</div>
                <div className="settings-profile-meta">
                  <div className="settings-profile-name">{name || copy.unnamed}</div>
                  <div className="settings-profile-role">{role}{company ? ' · ' + company : ''}</div>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor={`${idPrefix}-name`}>{copy.fullName}</label>
                <input id={`${idPrefix}-name`} value={name} readOnly placeholder={copy.namePlaceholder} />
              </div>
              <div className="settings-field">
                <label htmlFor={`${idPrefix}-email`}>{copy.email}</label>
                <input id={`${idPrefix}-email`} type="email" value={user?.email ?? ''} readOnly />
              </div>
              <div className="settings-field">
                <label htmlFor={`${idPrefix}-company`}>{copy.company}</label>
                <input id={`${idPrefix}-company`} value={company} readOnly placeholder={copy.companyPlaceholder} />
              </div>
            </div>
          </div>

          {primaryExtra}

          <ChangePasswordPanel idPrefix={idPrefix} copy={passwordCopy} />
        </div>

        <div>
          {roles.length > 0 && (
            <div className="panel">
              <div className="panel-head"><div className="panel-title">{copy.workspaces}</div></div>
              <div className="settings-body">
                {hasSeveralWorkspaces ? (
                  <WorkspaceSwitcher />
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sortRoles(roles).map((key) => (
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
                  {hasSeveralWorkspaces ? copy.workspacesNoteSeveral : copy.workspacesNoteSingle}
                </div>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head"><div className="panel-title">{copy.appearance}</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">{copy.theme}</div>
                  <div className="settings-row-desc">{copy.themeDesc}</div>
                </div>
                <div className="settings-theme-switch">
                  <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>{copy.dark}</button>
                  <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>{copy.light}</button>
                </div>
              </div>
            </div>
          </div>

          {secondaryExtra}

          <div className="panel">
            <div className="panel-head"><div className="panel-title">{copy.account}</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">{copy.signOut}</div>
                  <div className="settings-row-desc">{copy.signOutDesc}</div>
                </div>
                <button type="button" className="settings-logout-btn" onClick={handleLogout}>{copy.signOut}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
