import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from '@phosphor-icons/react'
import { listAlerts, ackAlert } from '../../api/alerts'
import { useResource } from '../../hooks/useResource'
import AlertList from '../alerts/AlertList'
import './AlertsBell.css'

// The bell in the top bar.
//
// It used to be an icon with no handler and a red dot rendered
// unconditionally in CSS -- a notification indicator that was on from the
// moment the app loaded and meant nothing. The dot is now the count, and
// the count is the number of conditions that are actually true.
const PANEL_LIMIT = 6

export default function AlertsBell() {
  const [open, setOpen] = useState(false)
  const [busyKey, setBusyKey] = useState(null)
  const wrapRef = useRef(null)

  const fetchAlerts = useCallback((signal) => listAlerts(signal), [])
  const { data, refetch } = useResource(fetchAlerts, [], { pollMs: 20000 })

  useEffect(() => {
    if (!open) return undefined
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const alerts = data?.alerts ?? []
  const degraded = data?.meta?.degraded ?? []
  const count = alerts.length

  async function onAck(a) {
    setBusyKey(a.key)
    try {
      await ackAlert({ alertKey: a.key, fingerprint: a.fingerprint })
      refetch()
    } catch (err) {
      window.alert(`Could not acknowledge — ${err.message}`)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="alerts-bell" ref={wrapRef}>
      <button
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={count ? `Alerts (${count})` : 'Alerts'}
        aria-expanded={open}
      >
        <Bell size={17} />
        {/* The count, not a decoration. Absent when there is nothing. */}
        {count > 0 && <span className="alerts-bell-count">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="alerts-bell-panel">
          <div className="alerts-bell-head">
            <span>{count === 0 ? 'Nothing to report' : `${count} active`}</span>
            <Link to="/alerts" onClick={() => setOpen(false)}>
              See all
            </Link>
          </div>

          {degraded.length > 0 && (
            <div className="alert-degraded">
              {degraded.length} of the checks did not run — this list is incomplete.
            </div>
          )}

          <AlertList
            alerts={alerts.slice(0, PANEL_LIMIT)}
            onAck={onAck}
            busyKey={busyKey}
            emptyLabel="Nothing to report."
          />

          {count > PANEL_LIMIT && (
            <Link className="alerts-bell-more" to="/alerts" onClick={() => setOpen(false)}>
              {count - PANEL_LIMIT} more
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
