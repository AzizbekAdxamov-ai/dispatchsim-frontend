import { useState, useCallback } from 'react'
import { dispatchLoad } from '../../api/loads'
import { listDrivers } from '../../api/drivers'
import { ApiError } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import './DispatchPanel.css'

// Putting a driver on a booked load.
//
// Until this existed a load accepted from a rate confirmation sat at
// 'neutral' forever: nothing dispatched it, so it never delivered and
// never got paid. Cash could only ever drain.
//
// The list is every driver on the roster, not a pre-filtered one. A driver
// with no truck is shown and can be picked; the server refuses and says
// why. That is deliberate -- a greyed-out row teaches nothing, while
// "that driver has no truck" tells a student exactly which of their two
// decisions is missing.

const ERRORS = {
  DRIVER_HAS_NO_TRUCK: 'That driver has no truck. Buy one on the truck market, then assign it to them.',
  DRIVER_HAS_ACTIVE_LOAD: 'That driver is already running a load.',
  DRIVER_NOT_FOUND: 'That driver is no longer on the roster.',
  LOAD_NOT_DISPATCHABLE: 'This load is no longer waiting to be dispatched.',
  LOAD_NOT_FOUND: 'This load no longer exists.',
}

function errorText(err) {
  const code = err instanceof ApiError ? err.code : null
  if (code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  return ERRORS[code] || err?.message || 'Something went wrong. Please try again.'
}

export default function DispatchPanel({ load, onDispatched }) {
  const [driverId, setDriverId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchDrivers = useCallback(async (signal) => await listDrivers(signal), [])
  const { data, loading } = useResource(fetchDrivers, [])
  const drivers = data?.drivers ?? []

  async function handleDispatch() {
    if (!driverId || busy) return
    setError('')
    setBusy(true)
    try {
      await dispatchLoad(load.id, driverId)
      onDispatched?.()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="ld-driver-empty">Loading drivers…</div>

  if (drivers.length === 0) {
    return (
      <div className="ld-driver-empty">
        No drivers on the roster. Hire one in HR, then buy a truck for them.
      </div>
    )
  }

  return (
    <div className="dp-body">
      <select
        className="dp-select"
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
      >
        <option value="">Choose a driver…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button
        type="button"
        className="dp-btn"
        disabled={busy || !driverId}
        onClick={handleDispatch}
      >
        {busy ? 'Dispatching…' : 'Dispatch'}
      </button>
      {error && <div className="dp-error" role="alert">{error}</div>}
    </div>
  )
}
