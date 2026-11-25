import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import { useResource } from '../hooks/useResource'
import { getOverview } from '../api/finance'
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher'
import ChangePasswordPanel from '../components/settings/ChangePasswordPanel'
import { PASSWORD_COPY } from '../data/passwordCopy'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Settings.css'

const COST_COPY = {
  title: 'Cost assumptions',
  fuelPrice: 'Fuel price per gallon',
  avgMpg: 'Average fuel economy',
  fixedCost: 'Fixed cost per mile',
  factoring: 'Factoring rate',
  note: 'Payment terms are set per load by the broker; driver pay is set per driver at hire.',
  unavailable: '—',
}

const PERCENT_FACTOR = 100

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

function money(value, suffix) {
  return typeof value === 'number' ? `$${value.toFixed(2)}${suffix}` : COST_COPY.unavailable
}

export default function FinanceSettings() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { data: overview } = useResource((signal) => getOverview(signal), [])

  const name = user?.name ?? ''
  const company = user?.company ?? ''
  const hasSeveralWorkspaces = (user?.roles?.length ?? 0) >= 2
  const assumptions = overview?.assumptions

  const costRows = [
    { label: COST_COPY.fuelPrice, value: money(assumptions?.fuelPricePerGal, ' / gal') },
    {
      label: COST_COPY.avgMpg,
      value: typeof assumptions?.avgMpg === 'number' ? `${assumptions.avgMpg} mpg` : COST_COPY.unavailable,
    },
    { label: COST_COPY.fixedCost, value: money(assumptions?.fixedCostPerMile, ' / mi') },
    {
      label: COST_COPY.factoring,
      value: typeof assumptions?.factoringRate === 'number'
        ? `${+(assumptions.factoringRate * PERCENT_FACTOR).toFixed(2)}%`
        : COST_COPY.unavailable,
    },
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-head-plain">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your profile, cost assumptions and account</div>
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
                  <div className="settings-profile-role">Finance{company ? ' · ' + company : ''}</div>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="fis-name">Full name</label>
                <input id="fis-name" value={name} readOnly placeholder="Full name" />
              </div>
              <div className="settings-field">
                <label htmlFor="fis-company">Company name</label>
                <input id="fis-company" value={company} readOnly placeholder="Company name" />
              </div>
            </div>
          </div>

          <ChangePasswordPanel idPrefix="fis" copy={PASSWORD_COPY} />
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
            <div className="panel-head"><div className="panel-title">{COST_COPY.title}</div></div>
            <div className="settings-body">
              {costRows.map((row) => (
                <div className="settings-row" key={row.label}>
                  <div className="settings-row-label">{row.label}</div>
                  <div className="mono">{row.value}</div>
                </div>
              ))}
              <div className="settings-row-desc">{COST_COPY.note}</div>
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
