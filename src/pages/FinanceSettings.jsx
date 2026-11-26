import { useResource } from '../hooks/useResource'
import { getOverview } from '../api/finance'
import AccountSettings, { ACCOUNT_SETTINGS_COPY } from '../components/settings/AccountSettings'
import '../components/dashboard/Panel.css'
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

const FINANCE_SETTINGS_COPY = {
  ...ACCOUNT_SETTINGS_COPY,
  sub: 'Manage your profile, cost assumptions and account',
}

const PERCENT_FACTOR = 100

function money(value, suffix) {
  return typeof value === 'number' ? `$${value.toFixed(2)}${suffix}` : COST_COPY.unavailable
}

export default function FinanceSettings() {
  const { data: overview } = useResource((signal) => getOverview(signal), [])
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

  const costPanel = (
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
  )

  return <AccountSettings idPrefix="fis" copy={FINANCE_SETTINGS_COPY} secondaryExtra={costPanel} />
}
