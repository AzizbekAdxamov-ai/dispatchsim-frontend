import { useCallback, useState } from 'react'
import { listLoadEvents, resolveLoadEvent } from '../../api/loads'
import { useResource } from '../../hooks/useResource'
import './RoadEventPanel.css'

// Something happened on the road, and the truck is stopped until it is
// answered.
//
// The stopping is the point. claimArrivedLoads skips loads with an open
// event, so ignoring this costs delivery time — without that an event
// would be a notification, and ignoring notifications would be the winning
// strategy.
//
// No option is recommended and none is marked safe. Waiting is free and
// slow, spending is fast and expensive, and which is right depends on the
// promise, the broker and what is in the account — facts the dispatcher
// has and the program does not judge.

function money(n) {
  return `$${Math.abs(n ?? 0).toLocaleString('en-US')}`
}

function costLine(o) {
  const parts = []
  // Guarded like every other part. An option with no hours rendered the
  // bare string "0h", which reads as a free choice -- the program telling
  // the student which one to pick -- and an undefined one rendered
  // "undefinedh". The catalogue has no such option today; the guard is so
  // that adding one is visible rather than silent.
  if (o.hours > 0) parts.push(`${o.hours}h`)
  if (o.costUsd > 0) parts.push(money(o.costUsd))
  if (o.extraMiles > 0) parts.push(`${o.extraMiles} mi`)
  if (o.accessorialUsd > 0) parts.push(`bills ${money(o.accessorialUsd)}`)
  return parts.length ? parts.join(' · ') : 'no stated cost'
}

export default function RoadEventPanel({ loadId, onResolved }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const fetchEvents = useCallback((signal) => listLoadEvents(loadId, signal), [loadId])
  // Polled: an event is raised by the background tick, not by anything
  // the dispatcher clicked.
  const { data, error: loadError, refetch } = useResource(fetchEvents, [loadId], { pollMs: 10000 })

  const open = data?.open ?? null
  const history = (data?.events ?? []).filter((e) => e.resolvedAt)

  async function choose(optionKey) {
    setBusy(optionKey)
    setError('')
    try {
      await resolveLoadEvent(loadId, open.id, optionKey)
      // AWAITED. Without it the buttons re-enabled while `open` still held
      // the resolved event, and a second click posted another resolve --
      // possibly with a different option.
      await refetch()
      onResolved?.()
    } catch (err) {
      setError(err?.message || 'Could not apply that.')
    } finally {
      setBusy(null)
    }
  }

  // A failed fetch must not look identical to "nothing happened on this
  // run". While an event is open the load does not deliver, so a silent
  // error would leave a truck stopped forever with no stated reason and
  // no way to retry -- the exact opposite of what this panel is for.
  if (loadError && !data) {
    return (
      <div className="rev-panel">
        <div className="rev-open">
          <div className="rev-note" role="alert">
            Could not read road events for this load — {loadError.message}.
            If the truck is stopped, this is where it would say so.
          </div>
          <button className="rev-option rev-retry" onClick={() => refetch()}>
            <span className="rev-option-label">Try again</span>
          </button>
        </div>
      </div>
    )
  }

  if (!open && history.length === 0) return null

  return (
    <div className="rev-panel">
      {open && (
        <div className="rev-open">
          <div className="rev-head">
            <span className="rev-summary">{open.summary}</span>
            <span className="rev-place">{open.place}</span>
          </div>
          <div className="rev-note">The truck is stopped until you decide.</div>

          {error && <div className="rev-error" role="alert">{error}</div>}

          <div className="rev-options">
            {(open.options ?? []).map((o) => (
              <button
                key={o.key}
                className="rev-option"
                onClick={() => choose(o.key)}
                disabled={busy !== null}
              >
                <span className="rev-option-label">{o.label}</span>
                <span className="rev-option-cost mono">{costLine(o)}</span>
                <span className="rev-option-detail">{o.detail}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rev-history">
          {history.map((e) => (
            <div className="rev-history-row" key={e.id}>
              <span>{e.summary} · {e.place}</span>
              <span className="rev-history-cost mono">
                +{e.hoursAdded}h
                {e.costUsd > 0 && ` · ${money(e.costUsd)}`}
                {e.accessorialUsd > 0 && ` · billed ${money(e.accessorialUsd)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
