import { useCallback, useState } from 'react'
import { listSettlements, listOwed, runPayroll } from '../api/payroll'
import { useResource } from '../hooks/useResource'
import { formatMoney } from '../utils/format'
import { describeWait } from '../utils/describeWait.js'
import './PageHeader.css'
import './FinanceSettlements.css'

// Driver pay, as a decision.
//
// This page used to compute its own settlement figures — a different gross
// formula from the one the ledger paid, a Fuel advance deduction no
// payment ever charged, real calendar weeks against money that moved on
// the compressed one, and a status derived as `periodEnd < oneWeekAgo`
// which for the current period is false by construction. Every settlement
// a student could see read 'pending' and could never read anything else.
//
// It now reads driver_settlements, and the button below is the thing that
// actually moves the money. Nothing pays a driver on its own any more.
const TABS = [
  { key: 'due', label: 'Due now', match: (s) => s.status === 'overdue' },
  { key: 'accrued', label: 'Accruing', match: (s) => s.status === 'accrued' },
  { key: 'paid', label: 'Paid', match: (s) => s.status === 'paid' },
  { key: 'all', label: 'All', match: () => true },
]

// What each stage means, in the driver's terms rather than the system's.
const STAGE_LABEL = {
  ok: null,
  asks: 'asking about it',
  refuses: 'not taking new loads',
  quits: 'has left',
}

export default function FinanceSettlements() {
  const [tab, setTab] = useState('due')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const fetchAll = useCallback(async (signal) => {
    const [settlements, owed] = await Promise.all([listSettlements(signal), listOwed(signal)])
    return { ...settlements, drivers: owed.drivers }
  }, [])
  const { data, error, loading, refetch } = useResource(fetchAll, [], { pollMs: 20000 })

  async function onRun() {
    setRunning(true)
    setResult(null)
    try {
      const res = await runPayroll()
      setResult(res)
      refetch()
    } catch (err) {
      // Loudly wrong. A payroll run that failed silently would look
      // identical to one where nothing was due.
      setResult({ error: err.message })
    } finally {
      setRunning(false)
    }
  }

  if (loading && !data) return <div className="page-empty">Loading settlements…</div>
  if (error && !data) return <div className="page-empty">Could not load settlements — {error.message}</div>

  const settlements = data?.settlements ?? []
  const meta = data?.meta ?? {}
  const drivers = (data?.drivers ?? []).filter((d) => d.stage !== 'ok')
  const activeTab = TABS.find((t) => t.key === tab)
  const filtered = settlements.filter(activeTab.match)

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Driver settlements</div>
          <div className="page-sub">
            Earned when a load delivers. Paid when you run payroll.
          </div>
        </div>
        <button className="payroll-run" onClick={onRun} disabled={running || !meta.dueNowCount}>
          {running
            ? 'Running…'
            : meta.dueNowCount
              ? `Run payroll — ${formatMoney(meta.dueNowUsd)}`
              : 'Nothing due'}
        </button>
      </div>

      {result && (
        <div className="payroll-result">
          {result.error
            ? `Payroll failed — ${result.error}`
            : result.paid?.length
              ? `Paid ${result.paid.length} settlement${result.paid.length === 1 ? '' : 's'}, ` +
                `${formatMoney(result.totalUsd)}. Balance is now ${formatMoney(result.balanceUsd)}.` +
                // A run is capped, so it can pay part of what the button
                // promised. Saying so is the difference between a student
                // who presses it again and one who thinks everyone is paid.
                (result.remainingDueUsd > 0
                  ? ` ${formatMoney(result.remainingDueUsd)} still due — run it again.`
                  : '')
              : 'Nothing was due.'}
          {result.failed?.length > 0 && ` ${result.failed.length} failed — see the server log.`}
        </div>
      )}

      {/* Who is waiting, and what the waiting has done. Above the table
          because it is the reason to press the button. */}
      {drivers.length > 0 && (
        <div className="payroll-drivers">
          {drivers.map((d) => (
            <div className="payroll-driver" key={d.driverId}>
              <span className="payroll-driver-name">{d.driverName}</span>
              <span className="payroll-driver-owed mono">{formatMoney(d.owedUsd)}</span>
              <span className="payroll-driver-stage">
                {describeWait(d.daysOverdue)} late · {STAGE_LABEL[d.stage]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="finance-summary-row">
        <div className="finance-summary-card">
          <div className="finance-summary-label">Owed to drivers</div>
          <div className="finance-summary-value mono">{formatMoney(meta.owedTotalUsd ?? 0)}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Due now</div>
          <div className="finance-summary-value mono">{formatMoney(meta.dueNowUsd ?? 0)}</div>
        </div>
        <div className="finance-summary-card">
          <div className="finance-summary-label">Settlements due</div>
          <div className="finance-summary-value mono">{meta.dueNowCount ?? 0}</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{settlements.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="page-empty">Nothing here.</div>
      ) : (
        <table className="settlement-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Load</th>
              <th>Lane</th>
              <th className="num">Gross</th>
              <th className="num">Deductions</th>
              <th className="num">Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.driverName}</td>
                <td className="mono">{s.loadId}</td>
                <td className="settlement-lane">
                  {s.originCity}, {s.originState} → {s.destinationCity}, {s.destinationState}
                </td>
                <td className="num mono">{formatMoney(s.grossUsd)}</td>
                <td className="num mono">{formatMoney(s.deductionsUsd)}</td>
                <td className="num mono">{formatMoney(s.netUsd)}</td>
                <td>
                  {s.status === 'paid' && 'Paid'}
                  {s.status === 'accrued' && 'Accruing'}
                  {/* The number, not a colour. How late it is, is a fact. */}
                  {s.status === 'overdue' && `${describeWait(s.daysOverdue)} late`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
