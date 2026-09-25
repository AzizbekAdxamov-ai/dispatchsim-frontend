import { Link } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { getDriverQualification } from '../api/compliance'
import { useResource } from '../hooks/useResource'
import { formatClock } from '../components/compliance/dutyStatus'
import { formatDate } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'
import './DriverQualification.css'

// Compliance > Driver Qualification. The carrier's paperwork duty -- 49
// CFR 391 Subpart E -- read as one row per driver with each document's
// state. The backend times every expiry against the compressed calendar,
// so a certificate seeded as "valid" ages to expiring and expired while
// the session runs; nothing here recomputes it. Facts with their CFR
// section; the file's state is the worst document, not an average.

const BADGE_BY_STATUS = {
  clear: { badge: 'ontime', label: 'Clear' },
  attention: { badge: 'warn', label: 'Attention' },
  action: { badge: 'crit', label: 'Action needed' },
}

const DOC_BADGE = {
  valid: { badge: 'ontime', label: 'Valid' },
  expiring: { badge: 'warn', label: 'Expiring' },
  expired: { badge: 'crit', label: 'Expired' },
  missing: { badge: 'crit', label: 'Not on file' },
  suspended: { badge: 'crit', label: 'Suspended' },
}

function DocCell({ doc, type }) {
  const badge = DOC_BADGE[doc.status] ?? DOC_BADGE.valid
  return (
    <td>
      <span className={'badge ' + badge.badge}><span className="dot"></span>{badge.label}</span>
      {doc.daysLeft != null && (
        <span className="dq-doc-detail mono">
          {type === 'mvr' && doc.status === 'valid'
            ? `${doc.daysLeft}d until review due`
            : doc.status === 'expiring' || doc.status === 'expired'
              ? `${formatDate(doc.expiresOn)}`
              : `${doc.daysLeft}d`}
        </span>
      )}
      {doc.status === 'valid' && doc.expiresOn != null && type !== 'mvr' && (
        <span className="dq-doc-detail mono">{formatDate(doc.expiresOn)}</span>
      )}
      {type === 'mvr' && doc.violations > 0 && (
        <span className="dq-doc-detail">{doc.violations} violation{doc.violations !== 1 ? 's' : ''} on record</span>
      )}
    </td>
  )
}

export default function DriverQualification() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')

  const { data, error, loading } = useResource((signal) => getDriverQualification(signal), [], { pollMs: 15000 })

  const rows = (data?.drivers ?? []).filter((r) => {
    if (query.trim() && !r.driver.name.toLowerCase().includes(query.trim().toLowerCase())) return false
    if (state !== 'all' && r.fileState !== state) return false
    return true
  })

  const counts = { clear: 0, attention: 0, action: 0 }
  for (const r of data?.drivers ?? []) counts[r.fileState] = (counts[r.fileState] ?? 0) + 1

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Driver Qualification</div>
          <div className="page-sub">
            Qualification files for every driver on the roster · 49 CFR 391 Subpart E
          </div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Driver..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search drivers"
          />
        </div>
        <label className="hos-filter">
          <span>File state</span>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All</option>
            <option value="clear">Clear</option>
            <option value="attention">Attention</option>
            <option value="action">Action needed</option>
          </select>
        </label>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${counts.clear} clear · ${counts.attention} attention · ${counts.action} action`}
        </div>
      </div>

      <div className="panel load-board hos-table">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>CDL</th>
              <th>Medical certificate</th>
              <th>MVR review</th>
              <th>Drug &amp; alcohol</th>
              <th>File</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="page-empty">Loading qualification files…</td></tr>}
            {!loading && error && <tr><td colSpan={7} className="page-empty">Could not load qualification files — {error.message}</td></tr>}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="page-empty">No drivers match this filter.</td></tr>
            )}
            {!loading && !error && rows.map((r) => {
              const file = BADGE_BY_STATUS[r.fileState] ?? BADGE_BY_STATUS.clear
              const docByType = Object.fromEntries(r.documents.map((d) => [d.type, d]))
              return (
                <tr className="row" key={r.driver.id}>
                  <td>
                    <Link to={`/drivers/${r.driver.id}`} className="row-primary-link">{r.driver.name}</Link>
                    {r.fileMissing && <span className="badge crit dq-missing-badge"><span className="dot"></span>File not on record</span>}
                  </td>
                  <DocCell doc={docByType.cdl} type="cdl" />
                  <DocCell doc={docByType.medical} type="medical" />
                  <DocCell doc={docByType.mvr} type="mvr" />
                  <DocCell doc={docByType.drugAlcohol} type="drugAlcohol" />
                  <td>
                    <span className={'badge ' + file.badge}><span className="dot"></span>{file.label}</span>
                  </td>
                  <td className="mono hos-muted">
                    {r.cdlClass ? `CDL-${r.cdlClass}` : ''}
                    {r.hosRemainingMin != null ? ` · ${formatClock(r.hosRemainingMin)} drive left` : ''}
                    {r.currentLoadId ? <> · <Link to={`/loads/${r.currentLoadId}`}>#{r.currentLoadId}</Link></> : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hos-footnote">
        Document states are re-read against the company calendar every time this page loads —
        a certificate that was valid when seeded ages into its renewal window as sessions pass.
        CDL 49 CFR 383 · Medical 391.43 · MVR 391.25 · Drug &amp; alcohol 382. Day counts are
        simulated days: one day every two minutes.
      </div>
    </>
  )
}
