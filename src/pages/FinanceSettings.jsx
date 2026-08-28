import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../theme/ThemeProvider'
import { PAYMENT_TERMS } from '../data/financeData'

// Matches finance.constants.js's FUEL_PRICE_PER_GAL on the backend — this
// form is a local-only settings draft (no PATCH endpoint exists yet), so
// the starting value is duplicated here rather than fetched.
const DEFAULT_FUEL_PRICE_PER_GAL = 4.05
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Settings.css'

const PAY_MODELS = [
  { key: 'percent', label: 'Percentage' },
  { key: 'permile', label: 'Per mile' },
]

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

export default function FinanceSettings() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const name = user?.name ?? ''
  const company = user?.company ?? ''

  const [billing, setBilling] = useState({
    paymentTerms: 'net30',
    factoringRate: 3,
    fuelPrice: DEFAULT_FUEL_PRICE_PER_GAL,
  })

  const [driverPay, setDriverPay] = useState({
    payModel: 'percent',
    percentRate: 27,
    perMileRate: 0.62,
    weeklyEscrow: 50,
  })

  const [notif, setNotif] = useState({
    invoicePastDue: true,
    paymentReceived: true,
    settlementReady: true,
    negativeMargin: true,
    monthlyExpenseSummary: false,
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-head-plain">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your profile, billing defaults and notifications</div>
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
                <input id="fis-name" value={name} readOnly placeholder="Alex Rivera" />
              </div>
              <div className="settings-field">
                <label htmlFor="fis-company">Company name</label>
                <input id="fis-company" value={company} readOnly placeholder="Nova Freight LLC" />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Password</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="fis-current-pw">Current password</label>
                <input id="fis-current-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="settings-field">
                <label htmlFor="fis-new-pw">New password</label>
                <input id="fis-new-pw" type="password" placeholder="••••••••" />
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
            <div className="panel-head"><div className="panel-title">Billing defaults</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="fis-terms">Default payment terms</label>
                <select
                  id="fis-terms"
                  value={billing.paymentTerms}
                  onChange={(e) => setBilling((b) => ({ ...b, paymentTerms: e.target.value }))}
                >
                  {Object.entries(PAYMENT_TERMS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="settings-field">
                <label htmlFor="fis-factoring">Factoring rate (%)</label>
                <input
                  id="fis-factoring" type="number" min="0" max="100" step="0.1"
                  value={billing.factoringRate}
                  onChange={(e) => setBilling((b) => ({ ...b, factoringRate: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label htmlFor="fis-fuel-price">Fuel price per gallon ($)</label>
                <input
                  id="fis-fuel-price" type="number" min="0" step="0.01"
                  value={billing.fuelPrice}
                  onChange={(e) => setBilling((b) => ({ ...b, fuelPrice: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Driver pay</div></div>
            <div className="settings-body">
              <div className="settings-field">
                <label htmlFor="fis-pay-model">Default pay model</label>
                <select
                  id="fis-pay-model"
                  value={driverPay.payModel}
                  onChange={(e) => setDriverPay((d) => ({ ...d, payModel: e.target.value }))}
                >
                  {PAY_MODELS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="settings-field">
                <label htmlFor="fis-pay-percent">Percentage of linehaul (%)</label>
                <input
                  id="fis-pay-percent" type="number" min="0" max="100" step="0.1"
                  value={driverPay.percentRate}
                  onChange={(e) => setDriverPay((d) => ({ ...d, percentRate: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="fis-pay-permile">Rate per mile ($)</label>
                <input
                  id="fis-pay-permile" type="number" min="0" step="0.01"
                  value={driverPay.perMileRate}
                  onChange={(e) => setDriverPay((d) => ({ ...d, perMileRate: Number(e.target.value) }))}
                />
              </div>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label htmlFor="fis-escrow">Weekly escrow ($)</label>
                <input
                  id="fis-escrow" type="number" min="0" step="1"
                  value={driverPay.weeklyEscrow}
                  onChange={(e) => setDriverPay((d) => ({ ...d, weeklyEscrow: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Notifications</div></div>
            <div className="settings-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Invoice past due</div>
                  <div className="settings-row-desc">Alert when a receivable crosses its due date</div>
                </div>
                <Toggle checked={notif.invoicePastDue} onChange={(v) => setNotif((n) => ({ ...n, invoicePastDue: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Payment received</div>
                  <div className="settings-row-desc">Notify when a broker payment clears</div>
                </div>
                <Toggle checked={notif.paymentReceived} onChange={(v) => setNotif((n) => ({ ...n, paymentReceived: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Settlement ready to pay</div>
                  <div className="settings-row-desc">Alert when a driver settlement is finalized for payout</div>
                </div>
                <Toggle checked={notif.settlementReady} onChange={(v) => setNotif((n) => ({ ...n, settlementReady: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Negative margin load</div>
                  <div className="settings-row-desc">Notify when a load's net profit drops below zero</div>
                </div>
                <Toggle checked={notif.negativeMargin} onChange={(v) => setNotif((n) => ({ ...n, negativeMargin: v }))} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Monthly expense summary</div>
                  <div className="settings-row-desc">Send a recap of operating costs at the end of each month</div>
                </div>
                <Toggle checked={notif.monthlyExpenseSummary} onChange={(v) => setNotif((n) => ({ ...n, monthlyExpenseSummary: v }))} />
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
