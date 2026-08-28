import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SettlementCard from '../components/finance/SettlementCard'
import { listSettlements } from '../api/finance'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatDate } from '../utils/format'
import './PageHeader.css'
import './FinanceSettlements.css'

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending', label: 'Pending', match: (s) => s.status === 'pending' },
  { key: 'paid', label: 'Paid', match: (s) => s.status === 'paid' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const card = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function FinanceSettlements() {
  const [tab, setTab] = useState('all')

  const { data, error, loading } = useResource((signal) => listSettlements(signal), [])
  const settlements = data?.settlements ?? []

  const totals = useMemo(() => {
    const gross = settlements.reduce((sum, s) => sum + s.grossUsd, 0)
    const deductions = settlements.reduce((sum, s) => sum + s.deductionTotalUsd, 0)
    const net = settlements.reduce((sum, s) => sum + s.netPayUsd, 0)
    const pending = settlements.filter((s) => s.status === 'pending').length
    return { gross, deductions, net, pending }
  }, [settlements])

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    return settlements.filter(activeTab.match)
  }, [settlements, tab])

  const periodLabel = data ? `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}` : '…'

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Driver settlements</div>
          <div className="page-sub">{`Weekly pay run — ${periodLabel}`}</div>
        </div>
      </div>

      <div className="finance-summary-row">
        <div className="finance-summary-card">
          <div className="finance-summary-label">Gross pay</div>
          <div className="finance-summary-value mono">{formatMoney(totals.gross)}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Deductions</div>
          <div className="finance-summary-value mono red">{formatMoney(totals.deductions)}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Net payable</div>
          <div className="finance-summary-value mono">{formatMoney(totals.net)}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Pending drivers</div>
          <div className="finance-summary-value amber">{totals.pending}</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{loading ? '—' : settlements.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      {loading && <div className="page-empty">Loading settlements…</div>}
      {!loading && error && <div className="page-empty">Could not load settlements — {error.message}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="page-empty">No settlements in this category.</div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <motion.div className="settlement-grid" variants={container} initial="hidden" animate="show">
          {filtered.map((s) => (
            <SettlementCard key={s.driverId} settlement={s} variants={card} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
