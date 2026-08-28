import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GasPump, Wrench, ShieldCheck, RoadHorizon, Receipt } from '@phosphor-icons/react'
import { EXPENSE_CATEGORIES } from '../data/financeData'
import { listExpenses, getOverview } from '../api/finance'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatDate } from '../utils/format'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './FinanceExpenses.css'

const CATEGORY_ICON = {
  fuel: GasPump,
  maintenance: Wrench,
  insurance: ShieldCheck,
  tolls: RoadHorizon,
  other: Receipt,
}

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  ...Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => ({
    key,
    label: meta.label,
    match: (e) => e.category === key,
  })),
]

export default function FinanceExpenses() {
  const [tab, setTab] = useState('all')

  const fetchAll = useCallback(async (signal) => {
    const [expensesRes, overview] = await Promise.all([listExpenses(signal), getOverview(signal)])
    return { expensesRes, costPerMileUsd: overview.costPerMileUsd }
  }, [])

  const { data, error, loading } = useResource(fetchAll, [])

  const expenses = data?.expensesRes?.expenses ?? []
  const byCategory = data?.expensesRes?.meta?.byCategory ?? {}
  const totalUsd = data?.expensesRes?.meta?.totalUsd

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    return expenses.filter(activeTab.match)
  }, [expenses, tab])

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-sub">Operating cost breakdown</div>
        </div>
      </div>

      <div className="finance-summary-row">
        <div className="finance-summary-card">
          <div className="finance-summary-label">Total this month</div>
          <div className="finance-summary-value mono">{totalUsd != null ? formatMoney(totalUsd) : '—'}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Fuel</div>
          <div className="finance-summary-value mono">{byCategory.fuel != null ? formatMoney(byCategory.fuel) : '—'}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Maintenance</div>
          <div className="finance-summary-value mono">{byCategory.maintenance != null ? formatMoney(byCategory.maintenance) : '—'}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Cost per mile</div>
          <div className="finance-summary-value mono">{data ? `$${data.costPerMileUsd.toFixed(2)}` : '—'}</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{loading ? '—' : expenses.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="page-empty">Loading expenses…</div>}
        {!loading && error && <div className="page-empty">Could not load expenses — {error.message}</div>}
        {!loading && !error && filtered.length === 0 && <div className="page-empty">No expenses in this category.</div>}
        {!loading && !error && (
          <AnimatePresence initial={false}>
            {filtered.map((e) => {
              const Icon = CATEGORY_ICON[e.category] ?? Receipt
              const meta = EXPENSE_CATEGORIES[e.category] ?? { label: e.category, tone: 'text-2' }
              return (
                <motion.div
                  className="expense-row"
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="expense-icon"><Icon size={15} aria-hidden="true" /></div>
                  <div className="expense-info">
                    <div className="expense-desc">{e.description}</div>
                    <div className="expense-meta">
                      {e.truckId && <span className="mono">{e.truckId}</span>}
                      {e.truckId && e.date ? ' · ' : ''}
                      {e.date ? formatDate(e.date) : ''}
                    </div>
                  </div>
                  <div className="expense-amount mono">{formatMoney(e.amountUsd)}</div>
                  <span className={'expense-tag ' + meta.tone}>{meta.label}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
