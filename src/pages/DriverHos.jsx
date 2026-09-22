import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { getDriverHos } from '../api/compliance'
import { useResource } from '../hooks/useResource'
import { DUTY_STATUSES, DUTY_STATUS_BY_KEY, formatClock } from '../components/compliance/dutyStatus'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'

// Compliance > Driver HOS. Columns and their order follow the fleet
// platform's Hours of Service report (vault: 01-Projects/Dispatch-
// atamalar-xaritasi.md). Every clock is computed by the backend
// (hosClock.js); this page only shows it. A clock at 0:00 is shown in red
// because it IS zero -- a fact about the driver's hours, not a verdict.

// The simulated clock runs 720x wall time: one real second is twelve HOS
// minutes. Polling every few seconds keeps the clocks within an hour of
// the truth, which is as close as this screen can honestly claim.
const POLL_MS = 3000

function Clock({ min, zeroIsLimit = true }) {
  const out = zeroIsLimit && min != null && min <= 0
  return <span className={'mono' + (out ? ' hos-zero' : '')}>{formatClock(min)}</span>
}

export default function DriverHos() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [violationsOnly, setViolationsOnly] = useState(false)

  const { data, error, loading } = useResource((signal) => getDriverHos(signal), [], { pollMs: POLL_MS })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.drivers ?? []).filter((r) => {
      if (q && !r.driver.name.toLowerCase().includes(q) && !(r.vehicle?.id ?? '').toLowerCase().includes(q)) return false
      if (status !== 'all' && r.dutyStatus !== status) return false
      if (violationsOnly && r.limits.length === 0) return false
      return true
    })
  }, [data, query, status, violationsOnly])

  const total = data?.drivers?.length ?? 0

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Driver HOS</div>
          <div className="page-sub">Hours of service clocks for every driver on the roster · 49 CFR 395</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Driver or vehicle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search drivers"
          />
        </div>
        <label className="hos-filter">
          <span>Duty Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {DUTY_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className="hos-filter hos-filter-check">
          <input type="checkbox" checked={violationsOnly} onChange={(e) => setViolationsOnly(e.target.checked)} />
          <span>Violations</span>
        </label>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${rows.length} of ${total} driver${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="panel load-board hos-table">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Duty status</th>
              <th>Time in current status</th>
              <th>Vehicle</th>
              <th>Time until break</th>
              <th>Drive remaining</th>
              <th>Shift remaining</th>
              <th>Cycle remaining</th>
              <th>Cycle tomorrow</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="page-empty">Loading hours of service…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={10} className="page-empty">Could not load hours of service — {error.message}</td></tr>
            )}
            {!loading && !error && total === 0 && (
              <tr><td colSpan={10} className="page-empty">No drivers on the roster.</td></tr>
            )}
            {!loading && !error && total > 0 && rows.length === 0 && (
              <tr><td colSpan={10} className="page-empty">No drivers match this filter.</td></tr>
            )}
            {!loading && !error && rows.map((r) => {
              const s = DUTY_STATUS_BY_KEY[r.dutyStatus]
              return (
                <tr className="row" key={r.driver.id} onClick={() => navigate(`/compliance/hos/${r.driver.id}`)}>
                  <td>
                    <Link to={`/compliance/hos/${r.driver.id}`} className="row-primary-link" onClick={(e) => e.stopPropagation()}>
                      {r.driver.name}
                    </Link>
                  </td>
                  <td>
                    {s ? (
                      <span className={'badge ' + s.badge}><span className="dot"></span>{s.label}</span>
                    ) : (
                      <span className="hos-muted" title="No duty status recorded right now">—</span>
                    )}
                    {r.drivingInViolation && <span className="badge crit hos-violation"><span className="dot"></span>Violation</span>}
                  </td>
                  <td><Clock min={r.timeInCurrentStatusMin} zeroIsLimit={false} /></td>
                  <td className="mono">{r.vehicle ? r.vehicle.id : '—'}</td>
                  <td><Clock min={r.timeUntilBreakMin} /></td>
                  <td><Clock min={r.driveRemainingMin} /></td>
                  <td><Clock min={r.shiftRemainingMin} /></td>
                  <td><Clock min={r.cycleRemainingMin} /></td>
                  <td><Clock min={r.cycleTomorrowMin} /></td>
                  <td className="loads-chevron" aria-hidden="true">›</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hos-footnote">
        Clocks are hours of service, not wall-clock time: the company calendar runs one day every two minutes.
        Cycle is 70 hours in 8 days (49 CFR 395.3(b)(2)).
      </div>
    </>
  )
}
