import { useCallback } from 'react'
import { getCashOverview, listLedger } from '../api/cash'
import { useResource } from '../hooks/useResource'
import { financeOff } from '../utils/financeSwitch'
import '../components/dashboard/Panel.css'
import './CashLedger.css'

// The account, and every movement in it.
//
// The balance is not stored anywhere — it is the sum of this list. That is
// why the page shows both: the number at the top is only ever true because
// of the rows underneath it, and a student who wonders where $140,000 went
// can read the answer instead of being told a total.

const KIND_LABEL = {
  opening: 'Opening balance',
  truck_purchase: 'Truck purchase',
  driver_onboarding: 'Driver onboarding',
  fuel: 'Fuel',
  load_payment: 'Load payment',
  settlement: 'Driver settlement',
  insurance: 'Insurance',
  interest: 'Credit line interest',
  truck_lease: 'Truck lease',
  adjustment: 'Adjustment',
}

function usd(n) {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

function signed(n) {
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`
}

function when(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function CashLedger() {
  const fetchOverview = useCallback(async (signal) => await getCashOverview(signal), [])
  const fetchLedger = useCallback(async (signal) => await listLedger({ limit: 200 }, signal), [])

  const { data: overview } = useResource(fetchOverview, [], { pollMs: 15000 })
  const { data: ledger, loading } = useResource(fetchLedger, [], { pollMs: 15000 })

  const entries = ledger?.entries ?? []

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Cash</h1>
        <p className="page-sub">
          Every dollar in and out. The balance is the sum of this list, nothing else.
        </p>
      </div>

      {/* The numbers below stay true -- they are what was spent and
          collected. What is gone is the consequence: with the money model
          off nothing accrues against this balance and nothing is refused
          because of it. Said here rather than left for someone to work out
          from a balance that has stopped moving. */}
      {financeOff(overview) && (
        <p className="cl-off">
          The money model is off on the server. No credit line interest, no insurance
          premium, and no load, hire or truck is refused for lack of money. The ledger
          below is still recorded.
        </p>
      )}

      <div className="cl-cards">
        <div className="cl-card">
          <div className="cl-card-label">Balance</div>
          <div className={`cl-card-value mono ${overview?.balance < 0 ? 'neg' : ''}`}>
            {usd(overview?.balance)}
          </div>
        </div>
        <div className="cl-card">
          <div className="cl-card-label">Owed to you</div>
          <div className="cl-card-value mono">{usd(overview?.outstandingUsd)}</div>
          <div className="cl-card-sub">
            {overview?.openInvoices ?? 0} delivered, unpaid
            {overview?.overdueUsd > 0 && ` · ${usd(overview.overdueUsd)} past due`}
          </div>
        </div>
        <div className="cl-card">
          <div className="cl-card-label">Available</div>
          <div className="cl-card-value mono">{usd(overview?.availableUsd)}</div>
          <div className="cl-card-sub">
            includes a {usd(overview?.creditLimitUsd)} credit line
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Transactions</span>
          <span className="panel-count">{entries.length}</span>
        </div>
        {loading && <div className="page-empty">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="page-empty" style={{ padding: 24 }}>
            Nothing yet.
          </div>
        )}
        {!loading && entries.length > 0 && (
          <table className="cl-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Detail</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="cl-when">{when(e.occurredAt)}</td>
                  <td>{KIND_LABEL[e.kind] || e.kind}</td>
                  <td className="cl-detail">{e.description}</td>
                  <td className={`right mono ${e.amountUsd < 0 ? 'neg' : 'pos'}`}>
                    {signed(e.amountUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
