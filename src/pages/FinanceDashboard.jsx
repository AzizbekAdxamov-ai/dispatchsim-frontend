import { useCallback } from 'react'
import { motion } from 'framer-motion'
import AlertStrip from '../components/dashboard/AlertStrip'
import StatCards from '../components/dashboard/StatCards'
import CashFlowChart from '../components/finance/CashFlowChart'
import DsoGauge from '../components/finance/DsoGauge'
import ArAgingChart from '../components/finance/ArAgingChart'
import LoadProfitTable from '../components/finance/LoadProfitTable'
import { getOverview, listInvoices, listSettlements } from '../api/finance'
import { useResource } from '../hooks/useResource'
import { formatMoney } from '../utils/format'
import '../components/fleet/FleetWidgets.css'
import './PageHeader.css'
import './FinanceDashboard.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const card = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function FinanceDashboard() {
  const fetchAll = useCallback(async (signal) => {
    const [overview, invoicesPage, settlements] = await Promise.all([
      getOverview(signal),
      listInvoices({ limit: 1 }, signal),
      listSettlements(signal),
    ])
    return { overview, invoiceCounts: invoicesPage.meta.counts, settlements: settlements.settlements }
  }, [])

  const { data, error, loading } = useResource(fetchAll, [], { pollMs: 20000 })

  if (loading) return <div className="page-empty">Loading financial overview…</div>
  if (error) return <div className="page-empty">Could not load the financial overview — {error.message}</div>
  if (!data) return null

  const { overview, invoiceCounts, settlements } = data
  const openReceivablesCount = (invoiceCounts?.open ?? 0) + (invoiceCounts?.overdue ?? 0)

  const lowestMarginLoad = overview.loadProfitability.length
    ? overview.loadProfitability.reduce((min, load) => (load.marginPct < min.marginPct ? load : min), overview.loadProfitability[0])
    : null

  const pendingSettlements = settlements.filter((s) => s.status === 'pending').length

  const alertItems = [
    {
      strong: `${overview.pastDueCount} invoices`,
      text: `are past due — ${formatMoney(overview.pastDueTotalUsd)} outstanding`,
    },
    ...(lowestMarginLoad
      ? [{
          strong: `Load #${lowestMarginLoad.loadId}`,
          text: `has the lowest margin on the board at ${lowestMarginLoad.marginPct}%`,
        }]
      : []),
    {
      strong: `${pendingSettlements} settlements`,
      text: 'are pending driver payout',
    },
  ]

  const stats = [
    {
      label: 'Outstanding AR',
      value: formatMoney(overview.totalOutstandingUsd),
      mono: true,
      delta: `${openReceivablesCount} invoices open`,
    },
    {
      label: 'Past due',
      value: formatMoney(overview.pastDueTotalUsd),
      tone: overview.pastDueCount === 0 ? undefined : overview.pastDueTotalUsd > 5000 ? 'red' : 'amber',
      delta: `${overview.pastDueCount} invoices`,
    },
    {
      label: 'Paid this month',
      value: formatMoney(overview.paidThisMonthUsd),
      mono: true,
      tone: 'green',
      delta: 'received',
    },
    {
      label: 'Gross margin',
      value: overview.grossMarginPct + '%',
      delta: 'across all loads',
    },
    {
      label: 'Avg days to pay',
      value: overview.avgDaysToPay + ' days',
      mono: true,
      delta: 'vs Net 30 target',
    },
  ]

  return (
    <>
      <AlertStrip items={alertItems} />

      <div className="page-head">
        <div>
          <div className="page-title">Financial overview</div>
          <div className="page-sub">Receivables, driver pay and operating costs</div>
        </div>
      </div>

      <StatCards stats={stats} />

      <motion.div className="widget-grid" variants={container} initial="hidden" animate="show">
        <motion.div className="area-widget" variants={card}>
          <CashFlowChart data={overview.cashFlowTrend} />
        </motion.div>
        <motion.div variants={card}>
          <DsoGauge value={overview.avgDaysToPay} />
        </motion.div>
        <motion.div variants={card}>
          <ArAgingChart data={overview.agingBuckets} />
        </motion.div>
      </motion.div>

      <div className="finance-profit-section">
        <LoadProfitTable loads={overview.loadProfitability} />
      </div>
    </>
  )
}
