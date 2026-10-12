import { useState, useCallback } from 'react'
import { getTruckOptions, assignTruck } from '../../api/drivers'
import { ApiError } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { truckOptionLabel, assignErrorText } from './truckOptions'
import './AssignTruckPanel.css'

// Putting a driver in a truck from the DRIVER's page -- the dispatcher's
// side of the same assignment fleet makes from the truck's page. The
// server runs one function for both (fleet's assignDriver), so the rules
// are the same whichever door is used.
//
// Shown only while the driver has no truck. A driver in a truck sees the
// truck, not this.

export default function AssignTruckPanel({ driverId, onAssigned }) {
  const [open, setOpen] = useState(false)
  const [truckId, setTruckId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchOptions = useCallback(
    (signal) => (open ? getTruckOptions(driverId, signal) : Promise.resolve(null)),
    [driverId, open],
  )
  const { data, loading, error: loadError } = useResource(fetchOptions, [driverId, open])
  const trucks = data?.trucks ?? []
  const assignable = trucks.filter((t) => t.assignable)

  async function handleAssign() {
    if (!truckId || busy) return
    setError('')
    setBusy(true)
    try {
      await assignTruck(driverId, truckId)
      setOpen(false)
      onAssigned?.()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(assignErrorText(err instanceof ApiError ? err.code : null, err?.message))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <span className="atp-inline">
        <span>—</span>
        <button type="button" className="atp-link" onClick={() => setOpen(true)}>Assign truck</button>
      </span>
    )
  }

  if (loading) return <div className="atp-note">Loading trucks…</div>
  // Loud, not silent: a list that failed to load is not an empty fleet.
  if (loadError) return <div className="atp-error" role="alert">Trucks could not load — {loadError.message}</div>

  if (trucks.length === 0) {
    return <div className="atp-note">Every truck in the fleet already has a driver.</div>
  }

  return (
    <div className="atp-body">
      <select className="atp-select" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
        <option value="">{assignable.length > 0 ? 'Choose a truck…' : 'No truck can be assigned right now'}</option>
        {trucks.map((t) => (
          <option key={t.id} value={t.id} disabled={!t.assignable}>
            {truckOptionLabel(t)}{t.assignable ? '' : ` — ${t.reason}`}
          </option>
        ))}
      </select>
      <div className="atp-actions">
        <button type="button" className="atp-btn" disabled={busy || !truckId} onClick={handleAssign}>
          {busy ? 'Assigning…' : 'Assign'}
        </button>
        <button type="button" className="atp-link" disabled={busy} onClick={() => { setOpen(false); setError('') }}>
          Cancel
        </button>
      </div>
      {error && <div className="atp-error" role="alert">{error}</div>}
    </div>
  )
}
