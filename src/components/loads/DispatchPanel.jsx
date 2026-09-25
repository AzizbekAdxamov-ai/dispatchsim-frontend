import { useState, useCallback } from 'react'
import { dispatchLoad, getDispatchCheck } from '../../api/loads'
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
//
// The check is the same discipline on screen: picking a driver shows the
// facts the dispatch will read -- qualification documents, the truck, the
// workload, the driver's willingness, the raw drive clock -- BEFORE the
// click. A failed line does not disable the button: the dispatch endpoint
// keeps its own guards, and the decision stays the dispatcher's. The
// check only makes sure the decision is made with the facts on the table.

const ERRORS = {
  DRIVER_HAS_NO_TRUCK: 'That driver has no truck. Buy one on the truck market, then assign it to them.',
  DRIVER_HAS_ACTIVE_LOAD: 'That driver is already running a load.',
  DRIVER_NOT_FOUND: 'That driver is no longer on the roster.',
  DRIVER_QUIT: 'That driver has left the company.',
  LOAD_NOT_DISPATCHABLE: 'This load is no longer waiting to be dispatched.',
  LOAD_NOT_FOUND: 'This load no longer exists.',
}

const STATE_BADGE = {
  ok: { badge: 'ontime', label: 'OK' },
  warn: { badge: 'warn', label: 'Attention' },
  fail: { badge: 'crit', label: 'Problem' },
  unknown: { badge: 'neutral', label: 'Unknown' },
}

function money(n) {
  return `$${Math.abs(n ?? 0).toLocaleString('en-US')}`
}

function errorText(err) {
  const code = err instanceof ApiError ? err.code : null
  if (code === 'NETWORK_ERROR') return 'Cannot reach the server.'

  // A refusal is not a validation failure, and it should not read like
  // one. The server sends what the driver is owed and how long they have
  // waited; saying only "not accepting work" would hide the one fact the
  // dispatcher can act on.
  if (code === 'DRIVER_REFUSED_WORK') {
    const d = err.details

    if (d?.owedUsd != null) {
      return `${d.driverName} is owed ${money(d.owedUsd)} across ` +
        `${d.unpaidCount} settlement${d.unpaidCount === 1 ? '' : 's'}, ` +
        `${d.daysOverdue} days past due, and is not taking new loads until it is paid. ` +
        'Run payroll in Finance → Settlements.'
    }
    return 'That driver is not taking new loads right now.'
  }

  return ERRORS[code] || err?.message || 'Something went wrong. Please try again.'
}

function CheckLine({ check }) {
  const badge = STATE_BADGE[check.state] ?? STATE_BADGE.unknown
  return (
    <li className="dp-check-line">
      <span className={'badge ' + badge.badge}><span className="dot"></span>{badge.label}</span>
      <span className="dp-check-label">
        {check.label}
        {check.cfr && <span className="dp-check-cfr">{check.cfr}</span>}
      </span>
      {check.detail && <span className="dp-check-detail">{check.detail}</span>}
    </li>
  )
}

export default function DispatchPanel({ load, onDispatched }) {
  const [driverId, setDriverId] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const fetchDrivers = useCallback(async (signal) => await listDrivers(signal), [])
  const { data, loading, error: rosterError } = useResource(fetchDrivers, [])
  const drivers = data?.drivers ?? []

  // The check loads once a driver is picked -- the same facts the dispatch
  // will read, asked through the read-only endpoint. Re-keyed on the pair
  // so switching drivers re-asks, and cleared when nobody is picked.
  const checkFetcher = useCallback(
    async (signal) => getDispatchCheck(load.id, driverId, signal),
    [load.id, driverId],
  )
  const { data: check, error: checkError } = useResource(
    checkFetcher,
    [load.id, driverId],
    { pollMs: 10000 },
  )

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

  // A failed request is not an empty roster. useResource leaves `data`
  // null on a failed initial load, so without this a 500 on GET /drivers
  // rendered a confident, wrong statement of fact -- and sent a student to
  // HR to hire drivers they already have.
  if (rosterError && !data) {
    return (
      <div className="ld-driver-empty" role="alert">
        Could not read the driver roster — {rosterError.message}
      </div>
    )
  }

  if (drivers.length === 0) {
    return (
      <div className="ld-driver-empty">
        No drivers on the roster. Hire one in HR, then buy a truck for them.
      </div>
    )
  }

  const failedChecks = (check?.checks ?? []).filter((c) => c.state === 'fail')
  const degraded = check?.degraded ?? []
  const transit = check?.transitDays

  return (
    <div className="dp-body">
      <select
        className="dp-select"
        value={driverId}
        onChange={(e) => {
          setDriverId(e.target.value)
          setConfirming(false)
          setError('')
        }}
      >
        <option value="">Choose a driver…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      {driverId && checkError && !check && (
        <div className="dp-check-error" role="alert">
          Could not run the pre-dispatch check — {checkError.message}. You can still dispatch;
          the server checks the same facts.
        </div>
      )}

      {driverId && check && (
        <div className="dp-check">
          <div className="dp-check-head">
            <span>Pre-dispatch check</span>
            <span className="dp-check-sub">
              {check.load.originLabel} → {check.load.destinationLabel}
              {check.load.distanceMi != null ? ` · ${check.load.distanceMi.toLocaleString('en-US')} mi` : ''}
              {' · '}{money(check.load.rateUsd)}
            </span>
          </div>
          <ul className="dp-check-list">
            {check.checks.map((c) => <CheckLine key={c.key} check={c} />)}
          </ul>
          {transit != null && (
            <div className="dp-check-transit">
              Broker's window: {transit} day{transit !== 1 ? 's' : ''} on the promised calendar —
              the legal arrival may be later once breaks and rest are planned.
            </div>
          )}
          {degraded.length > 0 && (
            <div className="dp-check-error" role="alert">
              {degraded.length} of the checks did not run ({degraded.join(', ')}) — this list is incomplete.
            </div>
          )}
          {failedChecks.length > 0 && (
            <div className="dp-check-warning">
              {failedChecks.length} line{failedChecks.length !== 1 ? 's' : ''} need attention.
              You can still dispatch — the server checks the same facts, and a refusal here
              is a decision you made with the facts on the table.
            </div>
          )}
        </div>
      )}

      {!confirming && (
        <button
          type="button"
          className="dp-btn"
          disabled={!driverId}
          onClick={() => {
            setConfirming(true)
            setError('')
          }}
        >
          Check &amp; dispatch
        </button>
      )}

      {confirming && (
        <div className="dp-confirm">
          <button
            type="button"
            className="dp-btn"
            disabled={busy || !driverId}
            onClick={handleDispatch}
          >
            {busy ? 'Dispatching…' : `Confirm dispatch${driverId ? ` — ${drivers.find((d) => d.id === driverId)?.name ?? ''}` : ''}`}
          </button>
          <button
            type="button"
            className="dp-btn dp-btn-secondary"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Back
          </button>
        </div>
      )}

      {error && <div className="dp-error" role="alert">{error}</div>}
    </div>
  )
}
