import { useState } from 'react'
import { unassignTruck } from '../../api/drivers'
import { ApiError } from '../../api/client'
import { unassignErrorText } from './truckOptions'
import { ASSIGN_TRUCK_COPY } from './assignTruckCopy'
import './AssignTruckPanel.css'

// Takes the driver off their truck. The server decides whether it may
// (a truck on a load stays), writes the lease owed up to this moment and
// stops the lease; a refusal is shown in the server's words, not swallowed.
export default function UnassignTruckButton({ driverId, onDone, copy = ASSIGN_TRUCK_COPY }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await unassignTruck(driverId)
      onDone?.()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(unassignErrorText(err instanceof ApiError ? err.code : null, err?.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="atp-inline">
      <button type="button" className="atp-link" disabled={busy} onClick={handleClick} title={copy.unassignNote}>
        {busy ? copy.unassigning : copy.unassign}
      </button>
      {error && <span className="atp-error" role="alert">{error}</span>}
    </span>
  )
}
