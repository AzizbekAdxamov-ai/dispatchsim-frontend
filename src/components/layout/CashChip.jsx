import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getCashOverview } from '../../api/cash'
import { useResource } from '../../hooks/useResource'
import './CashChip.css'

// The company balance, in the top bar, on every page.
//
// It belongs here rather than only on the Finance page because the people
// who spend the money are not the people who look at Finance: a dispatcher
// taking a cheap load from a slow-paying broker, or a fleet manager buying
// a second truck, both need to see what it costs at the moment they do it.
// A number tucked away in another workspace teaches nothing.
//
// Polled, because money moves on a background tick — a load delivers and
// fuel comes out, an invoice comes due and cash arrives — with nothing the
// user clicked to cause it.
function formatUsd(n) {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

export default function CashChip() {
  const fetchCash = useCallback(async (signal) => await getCashOverview(signal), [])
  const { data, loading } = useResource(fetchCash, [], { pollMs: 20000 })

  // Not `if (!data) return null`. useResource never populates `data` on
  // error, so a single failed request made the balance disappear from the
  // top bar of every page in every workspace — silently, on the number
  // this component exists to keep in front of whoever is spending it.
  if (loading && !data) return null
  if (!data) {
    return (
      <span className="cash-chip cash-chip-error" title="Could not read the balance">
        <span className="cash-chip-label">Cash</span>
        <span className="cash-chip-value mono">—</span>
      </span>
    )
  }

  const negative = data.balance < 0
  const owed = data.outstandingUsd > 0
  // Three states, three different facts. Under water is ordinary; past
  // the line the lender has stopped advancing; insolvent means
  // liabilities exceed assets. A dispatcher about to book a load needs to
  // know which one, and the balance alone does not say.
  const state = data.standing?.state

  return (
    <Link to="/cash" className="cash-chip" title="Company cash">
      <span className="cash-chip-label">Cash</span>
      <span className={`cash-chip-value mono ${negative ? 'neg' : ''}`}>
        {formatUsd(data.balance)}
      </span>
      {/* What is owed but not yet collected. Stated as a fact next to the
          balance because "you have $12,000" and "you have $12,000 and are
          owed $40,000" are completely different positions to be in. */}
      {owed && (
        <span className="cash-chip-sub mono" title="Delivered, not yet paid">
          +{formatUsd(data.outstandingUsd)} owed
        </span>
      )}
      {state === 'over_limit' && (
        <span className="cash-chip-state" title="The lender has stopped advancing — no new loads, hires or trucks">
          line used up
        </span>
      )}
      {state === 'insolvent' && (
        <span className="cash-chip-state" title="Liabilities exceed assets">
          insolvent
        </span>
      )}
    </Link>
  )
}
