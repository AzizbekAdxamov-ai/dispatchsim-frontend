import { Link } from 'react-router-dom'
import { getComplianceOverview } from '../api/stats'
import { useResource } from '../hooks/useResource'
import StatCards from '../components/dashboard/StatCards'
import { formatClock } from '../components/compliance/dutyStatus'
import { formatDate } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'
import './ComplianceOverview.css'

// Compliance > Overview. One screen answering "how clean is the
// operation right now", from the readings each compliance screen already
// owns: qualification files, today's HOS violations, the trucks stopped
// on a road event, and the ELD's unreviewed unidentified records. Every
// number links to the screen that owns it -- an overview is a table of
// contents, not a verdict. A source that failed to load says so in the
// degraded line instead of quietly reading as all-clear.

const POLL_MS = 10000

const BADGE_BY_STATE = {
  clear: { badge: 'ontime', label: 'Clear' },
  attention: { badge: 'warn', label: 'Expiring' },
  action: { badge: 'crit', label: 'Expired' },
  missing: { badge: 'crit', label: 'Not on file' },
}

function DocumentRow({ doc }) {
  const badge = BADGE_BY_STATE[doc.status] ?? BADGE_BY_STATE.action
  return (
    <div className="co-doc-row">
      <span className="co-doc-name">
        <Link to={`/drivers/${doc.driverId}`}>{doc.driverName}</Link>
        <span className="co-doc-type">{doc.cfr}</span>
      </span>
      <span className="co-doc-state">
        <span className={'badge ' + badge.badge}><span className="dot"></span>{badge.label}</span>
        <span className="mono co-doc-detail">
          {doc.status === 'missing'
            ? 'not on file'
            : doc.daysLeft != null && doc.daysLeft < 0
              ? `expired ${formatDate(doc.expiresOn)}`
              : doc.expiresOn
                ? `until ${formatDate(doc.expiresOn)}`
                : ''}
        </span>
      </span>
    </div>
  )
}

export default function ComplianceOverview() {
  const { data, error, loading } = useResource((signal) => getComplianceOverview(signal), [], { pollMs: POLL_MS })

  if (loading && !data) return <div className="panel page-empty">Loading compliance overview…</div>
  if (error && !data) return <div className="panel page-empty">Could not load the overview — {error.message}</div>
  if (!data) return null

  const degraded = data.degraded ?? []
  const tiles = [
    {
      label: 'Drivers',
      value: data.drivers.action > 0
        ? <span className="co-tile-warn">{data.drivers.action} of {data.drivers.total}</span>
        : data.drivers.total,
      delta: `${data.drivers.clear} clear · ${data.drivers.attention} expiring · ${data.drivers.action} action`,
    },
    {
      label: 'HOS violations today',
      value: data.hos.violationMinutesToday > 0
        ? <span className="co-tile-warn">{formatClock(data.hos.violationMinutesToday)}</span>
        : 0,
      delta: `${data.hos.driversWithViolationsToday} driver${data.hos.driversWithViolationsToday !== 1 ? 's' : ''} · 49 CFR 395.3`,
    },
    {
      label: 'Stopped trucks',
      value: data.vehicles.stoppedEvents > 0
        ? <span className="co-tile-warn">{data.vehicles.stoppedEvents}</span>
        : 0,
      delta: 'waiting on a road event decision',
    },
    {
      label: 'Unreviewed ELD records',
      value: data.eld.unreviewedUnidentified > 0
        ? <span className="co-tile-warn">{data.eld.unreviewedUnidentified}</span>
        : (data.eld.unreviewedUnidentified ?? '—'),
      delta: `unidentified driving · ${data.eld.reviewThresholdMin}+ min · 49 CFR 395.32`,
    },
  ]
  const openDocuments = data.openDocuments ?? []

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Compliance Overview</div>
          <div className="page-sub">What the operation owes the regulator right now · 49 CFR 382, 383, 391, 395</div>
        </div>
      </div>

      {degraded.length > 0 && (
        <div className="panel co-degraded" role="alert">
          {degraded.length} of the sources did not load ({degraded.join(', ')}) — the tiles below are incomplete.
        </div>
      )}

      <StatCards stats={tiles} />

      <div className="panel co-docs">
        <div className="co-docs-head">
          <span>Open documents</span>
          <span className="co-docs-hint">renewal calendar, soonest first</span>
        </div>
        {openDocuments.length === 0 && (
          <div className="page-empty">Nothing expiring and nothing on file missing.</div>
        )}
        {openDocuments.map((doc, i) => (
          <DocumentRow key={`${doc.driverId}-${doc.document}-${i}`} doc={doc} />
        ))}
      </div>

      <div className="hos-footnote">
        Every tile reads the same source its screen does — nothing is recomputed here.
        Days are company days: one day every two minutes. An expired or missing document
        does not stop a dispatch; it is a fact the next audit asks about.
      </div>
    </>
  )
}
