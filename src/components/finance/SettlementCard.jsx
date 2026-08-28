import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatMoney, formatMiles } from '../../utils/format'
import '../dashboard/LoadBoard.css'
import './SettlementCard.css'

const STATUS_BADGE = {
  paid: 'done',
  pending: 'warn',
}

const STATUS_LABEL = {
  paid: 'Paid',
  pending: 'Pending',
}

// The settlements endpoint returns only `payModel` (percent | permile), not
// the driver's exact rate/percentage — see finance.service.js's
// buildSettlement, which keeps that detail server-side. A generic label is
// shown instead of a fabricated number.
const PAY_MODEL_LABEL = {
  percent: 'Percentage of linehaul',
  permile: 'Per-mile rate',
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

export default function SettlementCard({ settlement, variants }) {
  const [open, setOpen] = useState(false)

  const deductionSharePct = settlement.grossUsd > 0
    ? Math.min(100, Math.round((settlement.deductionTotalUsd / settlement.grossUsd) * 100))
    : 0

  return (
    <motion.div className="settlement-card" variants={variants} layout>
      <button
        type="button"
        className="settlement-card-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="settlement-card-top">
          <div className="settlement-card-avatar" aria-hidden="true">{initials(settlement.driver)}</div>
          <div className="settlement-card-id">
            <div className="settlement-card-name">{settlement.driver}</div>
            {settlement.truckId && <div className="settlement-card-unit mono">{settlement.truckId}</div>}
          </div>
          <span className={'badge ' + STATUS_BADGE[settlement.status]}>
            <span className="dot"></span>
            {STATUS_LABEL[settlement.status]}
          </span>
        </div>

        <div className="settlement-card-paymodel">{PAY_MODEL_LABEL[settlement.payModel] ?? settlement.payModel}</div>

        <div className="settlement-card-miles">
          <span className="settlement-card-miles-val mono">{formatMiles(settlement.miles)}</span>
          <span className="settlement-card-miles-lbl">Miles</span>
        </div>

        <div className="settlement-card-figures">
          <div className="settlement-card-figure-row">
            <span className="settlement-card-figure-lbl">Gross</span>
            <span className="settlement-card-figure-val mono">{formatMoney(settlement.grossUsd)}</span>
          </div>
          <div className="settlement-card-figure-row">
            <span className="settlement-card-figure-lbl">Deductions</span>
            <span className="settlement-card-figure-val mono negative">-{formatMoney(settlement.deductionTotalUsd)}</span>
          </div>
        </div>

        <div className="settlement-card-deduction-track">
          <div className="settlement-card-deduction-fill" style={{ width: deductionSharePct + '%' }} />
        </div>

        <div className="settlement-card-net">
          <span className="settlement-card-net-lbl">Net pay</span>
          <span className="settlement-card-net-val mono">{formatMoney(settlement.netPayUsd)}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="settlement-card-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="settlement-card-deductions">
              {settlement.deductions.map((d) => (
                <div className="settlement-card-deduction-row" key={d.label}>
                  <span>{d.label}</span>
                  <span className="mono">-{formatMoney(d.amountUsd)}</span>
                </div>
              ))}
            </div>
            <div className="settlement-card-loads">
              <div className="settlement-card-loads-lbl">Loads this period</div>
              <div className="settlement-card-loads-val mono">
                {settlement.loadIds.length > 0
                  ? settlement.loadIds.join(', ')
                  : 'No loads assigned this period'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
