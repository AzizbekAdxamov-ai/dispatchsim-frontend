import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlass, CaretDown, CaretRight } from '@phosphor-icons/react'
import { getHosViolations } from '../api/compliance'
import { useResource } from '../hooks/useResource'
import { formatClock } from '../components/compliance/dutyStatus'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'

// Compliance > HOS Violations. The platform's columns -- Driver,
// Violations (Time), Days -- with the individual violations one click
// down. A violation is driving time while an HOS clock was at zero,
// found by the backend (hosClock.js's findViolations). Facts with their
// CFR section; no score, no verdict.

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: 'Last 7 days' },
  { days: 8, label: 'Last 8 days' },
]

function dayLabel(offset) {
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  return `${-offset} days ago`
}

function timeOnDay(iso, dayOffset, todayStartMs, dayMs) {
  const dayStart = todayStartMs + dayOffset * dayMs
  const min = Math.round(((new Date(iso).getTime() - dayStart) / dayMs) * 24 * 60)
  const clamped = Math.min(24 * 60 - 1, Math.max(0, min))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export default function HosViolations() {
  const [days, setDays] = useState(7)
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set())

  const { data, error, loading } = useResource((signal) => getHosViolations(days, signal), [days], { pollMs: 5000 })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.drivers ?? [])
      .map((d) => {
        const violations = type === 'all' ? d.violations : d.violations.filter((v) => v.types.some((t) => t.code === type))
        return {
          ...d,
          violations,
          violationMinutes: violations.reduce((sum, v) => sum + v.minutes, 0),
          days: new Set(violations.map((v) => v.dayOffset)).size,
        }
      })
      .filter((d) => d.violations.length > 0)
      .filter((d) => !q || d.driver.name.toLowerCase().includes(q))
      .sort((a, b) => b.violationMinutes - a.violationMinutes)
  }, [data, type, query])

  const todayStartMs = data?.todayStart ? new Date(data.todayStart).getTime() : null
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">HOS Violations</div>
          <div className="page-sub">Driving while an hours-of-service clock was at zero · 49 CFR 395.3</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input type="text" placeholder="Driver..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search drivers" />
        </div>
        <label className="hos-filter">
          <span>Date range</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
        </label>
        <label className="hos-filter">
          <span>Violation Types</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            {(data?.types ?? []).map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </label>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${rows.length} driver${rows.length !== 1 ? 's' : ''} with violations`}
        </div>
      </div>

      <div className="panel load-board hos-table">
        <table>
          <thead>
            <tr>
              <th className="hos-expand-col" aria-label="Expand" />
              <th>Driver</th>
              <th>Violations (Time)</th>
              <th>Days</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="page-empty">Loading violations…</td></tr>}
            {!loading && error && <tr><td colSpan={5} className="page-empty">Could not load violations — {error.message}</td></tr>}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={5} className="page-empty">No violations in this range.</td></tr>
            )}
            {!loading && !error && rows.map((d) => {
              const isOpen = open.has(d.driver.id)
              return (
                <Fragment key={d.driver.id}>
                  <tr className="row" onClick={() => toggle(d.driver.id)} aria-expanded={isOpen}>
                    <td className="hos-muted">{isOpen ? <CaretDown size={13} /> : <CaretRight size={13} />}</td>
                    <td>{d.driver.name}</td>
                    <td className="mono">{formatClock(d.violationMinutes)}</td>
                    <td className="mono">{d.days}</td>
                    <td className="hos-link-cell">
                      <Link to={`/compliance/hos/${d.driver.id}`} onClick={(e) => e.stopPropagation()}>View Event Log</Link>
                    </td>
                  </tr>
                  {isOpen && d.violations.map((v, i) => (
                    <tr key={`${d.driver.id}-${i}`} className="hos-violation-detail">
                      <td />
                      <td>
                        {v.types.map((t) => (
                          <span key={t.code} className="badge crit hos-type-badge" title={`49 CFR ${t.cfr}`}>
                            <span className="dot"></span>{t.label}
                          </span>
                        ))}
                      </td>
                      <td className="mono">{formatClock(v.minutes)}</td>
                      <td>{dayLabel(v.dayOffset)}</td>
                      <td className="mono hos-muted">
                        {todayStartMs != null && data?.dayMs ? `from ${timeOnDay(v.startedAt, v.dayOffset, todayStartMs, data.dayMs)}` : ''}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hos-footnote">
        Times are hours of service.
      </div>
    </>
  )
}
