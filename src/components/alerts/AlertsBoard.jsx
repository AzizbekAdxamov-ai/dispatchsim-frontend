import { useCallback, useState } from 'react'
import { listAlerts, ackAlert, unackAlert } from '../../api/alerts'
import { useResource } from '../../hooks/useResource'
import AlertList from './AlertList'
import '../dashboard/Panel.css'
import '../../pages/PageHeader.css'
import './AlertsBoard.css'

// The alert board, shared by /alerts and /fleet/alerts.
//
// Both of those pages used to be permanent empty states. They said "No
// active alerts" whatever was happening, and each promised alerts it could
// never produce -- HOS limits and missing documents on one, tyre wear and
// low fuel on the other. Nothing writes those columns at runtime, so the
// promise was not merely unimplemented, it was undeliverable.
//
// `families` narrows the list to one workspace's concerns. `note` is where
// a page states what the simulator does NOT track, because a student who
// sees an empty fleet board deserves to know whether that means "all is
// well" or "nobody is measuring".
export default function AlertsBoard({ title, sub, families = null, note = null }) {
  const [tab, setTab] = useState('active')
  const [busyKey, setBusyKey] = useState(null)

  const fetchAlerts = useCallback((signal) => listAlerts(signal), [])
  const { data, error, loading, refetch } = useResource(fetchAlerts, [], { pollMs: 20000 })

  async function act(fn, alert) {
    setBusyKey(alert.key)
    try {
      await fn()
      // refetch() bumps a token rather than returning a promise, so the
      // list updates on the next render, not on this line.
      refetch()
    } catch (err) {
      // Loudly wrong, never quietly wrong: a failed acknowledgement that
      // only reached the console would look exactly like a successful one.
      window.alert(`Could not update this alert — ${err.message}`)
    } finally {
      setBusyKey(null)
    }
  }

  const onAck = (a) => act(() => ackAlert({ alertKey: a.key, fingerprint: a.fingerprint }), a)
  const onUnack = (a) => act(() => unackAlert({ alertKey: a.key }), a)

  if (loading && !data) return null
  if (error && !data) {
    return <div className="page-empty">Could not load alerts — {error.message}</div>
  }

  const all = data?.alerts ?? []
  const alerts = families ? all.filter((a) => families.includes(a.family)) : all
  const meta = data?.meta ?? {}
  const degraded = meta.degraded ?? []

  return (
    <div className="alerts-page">
      <div className="page-head">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{sub}</div>
        </div>
      </div>

      <div className="page-tabs">
        <button
          className={`page-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active <span className="page-tab-count">{alerts.length}</span>
        </button>
        <button
          className={`page-tab ${tab === 'acknowledged' ? 'active' : ''}`}
          onClick={() => setTab('acknowledged')}
        >
          Acknowledged <span className="page-tab-count">{meta.acknowledged ?? 0}</span>
        </button>
      </div>

      <div className="panel">
        {/* A short list because a query failed must not read as good news. */}
        {degraded.length > 0 && (
          <div className="alert-degraded">
            {degraded.length} of the checks did not run ({degraded.join(', ')}) — this list is
            incomplete.
          </div>
        )}

        {tab === 'active' ? (
          <AlertList
            alerts={alerts}
            onAck={onAck}
            busyKey={busyKey}
            emptyLabel="Nothing to report."
          />
        ) : (
          <div className="alert-list-empty">
            {meta.acknowledged
              ? `${meta.acknowledged} acknowledged. Each one returns on its own if the situation changes.`
              : 'Nothing acknowledged.'}
          </div>
        )}
      </div>

      {note && <div className="alerts-note">{note}</div>}
    </div>
  )
}
