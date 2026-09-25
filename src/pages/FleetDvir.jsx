import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { listDvir, certifyDvir } from '../api/fleet'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { formatDate } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'
import './FleetDvir.css'

// Fleet > DVIR. The daily vehicle inspection report (49 CFR 396.11), one
// row per finished run: the nine-item checklist as badges, the defect
// notes the driver wrote, and the certification state (396.13) that says
// whether the next driver has signed the defects off. A report with
// uncertified defects holds the truck -- the row says so and offers the
// certify action; a clean report is history, and reads like it.

const POLL_MS = 15000

const OK = { badge: 'ontime', label: 'OK' }
const FAILED = { badge: 'crit', label: 'Defect' }

// The wear notes (tread between the note and defect thresholds, a roadside
// observation) ride in their own list: they never hold the truck, so they
// never ride the defect list either.
function NoteLines({ report }) {
  if (!report.notes?.length) return null
  return (
    <div className="dvir-notes dvir-report-notes">
      {report.notes.map((n, i) => <div key={i}>{n.detail}</div>)}
    </div>
  )
}

function ItemBadges({ report, items }) {
  return (
    <div className="dvir-items">
      {items.map((item) => {
        const ok = report[`${item.key}Ok`]
        const badge = ok ? OK : FAILED
        return (
          <span key={item.key} className={'badge ' + badge.badge} title={item.cfr}>
            <span className="dot"></span>{item.label}
          </span>
        )
      })}
    </div>
  )
}

export default function FleetDvir() {
  const [query, setQuery] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const { data, error, loading, refetch } = useResource((signal) => listDvir(signal), [], { pollMs: POLL_MS })

  const items = data?.items ?? []
  const reports = (data?.reports ?? []).filter((r) => {
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const truck = (r.truckId ?? '').toLowerCase()
      const driver = (r.driver?.name ?? '').toLowerCase()
      if (!truck.includes(q) && !driver.includes(q)) return false
    }
    if (onlyOpen && !(r.defects.length > 0 && !r.defectsCorrected)) return false
    return true
  })

  async function handleCertify(report) {
    if (!report.driver?.id) {
      setActionError('No driver on record for this truck assignment.')
      return
    }
    setBusyId(report.id)
    setActionError('')
    try {
      await certifyDvir(report.id, report.driver.id)
      refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SERVICE_ALREADY_DONE') setActionError('This report is already certified.')
        else if (err.code === 'TRUCK_HAS_DRIVER') setActionError('Only the truck\u2019s current driver can certify this report.')
        else setActionError(err.message)
      } else {
        setActionError('Something went wrong. Please try again.')
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">DVIR</div>
          <div className="page-sub">Daily vehicle inspection reports, written at delivery · 49 CFR 396.11 / 396.13</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Truck or driver..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search reports"
          />
        </div>
        <label className="hos-filter hos-filter-check">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          <span>Uncertified defects only</span>
        </label>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${reports.length} report${reports.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {actionError && <div className="panel dvir-action-error" role="alert">{actionError}</div>}

      <div className="panel load-board hos-table">
        <table>
          <thead>
            <tr>
              <th>Truck</th>
              <th>Driver</th>
              <th>Date</th>
              <th>Checklist</th>
              <th>Notes</th>
              <th>396.13</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="page-empty">Loading inspection reports…</td></tr>}
            {!loading && error && <tr><td colSpan={7} className="page-empty">Could not load reports — {error.message}</td></tr>}
            {!loading && !error && reports.length === 0 && (
              <tr><td colSpan={7} className="page-empty">No inspection reports yet. One is written every time a run is delivered.</td></tr>
            )}
            {!loading && !error && reports.map((r) => {
              const holds = r.defects.length > 0 && !r.defectsCorrected
              return (
                <tr className="row" key={r.id}>
                  <td className="mono">
                    <Link to={`/fleet/trucks/${r.truckId}`}>{r.truckId}</Link>
                    {r.odometerMi != null && <span className="dvir-sub mono">{r.odometerMi.toLocaleString('en-US')} mi</span>}
                  </td>
                  <td>{r.driver?.name ?? <span className="hos-muted">—</span>}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td><ItemBadges report={r} items={items} /></td>
                  <td>
                    <div className="dvir-notes">
                      {r.defects.length === 0
                        ? <span className="hos-muted">No defects noted.</span>
                        : r.defects.map((d, i) => <div key={i}>{d.detail}</div>)}
                    </div>
                    <NoteLines report={r} />
                  </td>
                  <td>
                    {r.defects.length === 0
                      ? <span className="hos-muted">Nothing to certify</span>
                      : r.defectsCorrected
                        ? <span className="badge ontime"><span className="dot"></span>Certified{r.certifiedBy?.name ? ` by ${r.certifiedBy.name}` : ''}</span>
                        : <span className="badge crit"><span className="dot"></span>Holds the truck</span>}
                  </td>
                  <td className="dvir-actions-cell">
                    {holds && (
                      <button
                        type="button"
                        className="dvir-certify-btn"
                        disabled={busyId === r.id}
                        onClick={() => handleCertify(r)}
                      >
                        {busyId === r.id ? 'Certifying…' : 'Certify fixed'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hos-footnote">
        A report is written every time a run is delivered, from the truck's arrival state.
        A failed item (396.11) holds the vehicle until the next driver certifies the defects
        fixed (396.13(b)(2)); a wear note does not hold it. Checklist sections cite their rule:
        393.40 brakes, 393.75 tires, 393.70 coupling, 393.95 emergency equipment.
      </div>
    </>
  )
}
