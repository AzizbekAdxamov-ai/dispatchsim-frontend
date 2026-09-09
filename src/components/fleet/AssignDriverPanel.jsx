import { useState, useCallback } from 'react'
import { assignDriverToTruck } from '../../api/truckListings'
import { listDrivers } from '../../api/drivers'
import { ApiError } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import './AssignDriverPanel.css'

// Pairing a driver with a truck -- the step that was missing entirely.
//
// Hiring and buying are two separate decisions, and neither one on its own
// produces anything that can move freight. This is where they meet, and
// until it existed the chain simply stopped here.

const ERRORS = {
  TRUCK_NOT_FOUND: 'This truck is no longer in the fleet.',
  TRUCK_NOT_IDLE: 'This truck is not idle — it is already working or in the shop.',
  TRUCK_HAS_DRIVER: 'This truck already has a driver.',
  DRIVER_HAS_TRUCK: 'That driver is already in another truck.',
  FORBIDDEN: 'Assigning drivers is fleet-manager work — switch workspace first.',
  NETWORK_ERROR: 'Cannot reach the server.',
}

function errorText(err) {
  const code = err instanceof ApiError ? err.code : null
  return ERRORS[code] || err?.message || 'Something went wrong. Please try again.'
}

export default function AssignDriverPanel({ truckId, onAssigned }) {
  const [driverId, setDriverId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchDrivers = useCallback(async (signal) => await listDrivers(signal), [])
  const { data, loading } = useResource(fetchDrivers, [])
  const drivers = data?.drivers ?? []

  async function handleAssign() {
    if (!driverId || busy) return
    setError('')
    setBusy(true)
    try {
      await assignDriverToTruck(truckId, driverId)
      onAssigned?.()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="adp-empty">Loading drivers…</div>

  if (drivers.length === 0) {
    return <div className="adp-empty">No drivers on the roster. Hire one in HR first.</div>
  }

  return (
    <div className="adp-body">
      <select className="adp-select" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
        <option value="">Choose a driver…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button type="button" className="adp-btn" disabled={busy || !driverId} onClick={handleAssign}>
        {busy ? 'Assigning…' : 'Assign driver'}
      </button>
      {error && <div className="adp-error" role="alert">{error}</div>}
    </div>
  )
}
