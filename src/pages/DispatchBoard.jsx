import { Link } from 'react-router-dom'
import { getLoadBoard } from '../api/loads'
import { useResource } from '../hooks/useResource'
import { formatMoney } from '../utils/format'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './DispatchBoard.css'

// Dispatch > Board. The workflow the dispatch module IS, as four columns:
// what can move, what is paired but not yet rolling (the ELD's own
// window -- dispatched, no driving minute on the log yet; the gap a
// driver's owed rest at the origin lives in), what is rolling, and what
// is history. Cards link into the load; a moving card with an open road
// event wears the stopped badge in place, because a truck waiting on a
// decision is the one thing on this board a dispatcher must act on.

const POLL_MS = 8000

const STATUS_BADGE = {
  ontime: { badge: 'ontime', label: 'On time' },
  warn: { badge: 'warn', label: 'Running behind' },
  crit: { badge: 'crit', label: 'Late' },
}

function Lane({ city, state }) {
  return <span>{city}, {state}</span>
}

function Card({ card }) {
  const statusBadge = STATUS_BADGE[card.status]
  return (
    <Link to={`/loads/${card.id}`} className="db-card">
      <div className="db-card-head">
        <span className="mono db-card-id">#{card.id}</span>
        <span className="mono db-card-rate">{formatMoney(card.rateUsd)}</span>
      </div>
      <div className="db-card-lane">
        <Lane city={card.originCity} state={card.originState} />
        {' → '}
        <Lane city={card.destinationCity} state={card.destinationState} />
      </div>
      <div className="db-card-meta">
        {card.driver?.name
          ? <span>{card.driver.name}{card.truck?.id ? <span className="mono"> · {card.truck.id}</span> : null}</span>
          : <span className="db-card-muted">No driver</span>}
        {statusBadge && (
          <span className={'badge ' + statusBadge.badge}><span className="dot"></span>{statusBadge.label}</span>
        )}
      </div>
      {card.stopped && card.openEvent && (
        <div className="db-card-stopped" role="status">
          Stopped — {card.openEvent.eventType} at {card.openEvent.place}
        </div>
      )}
      {card.progress != null && card.status !== 'neutral' && card.status !== 'done' && (
        <div className="db-card-progress" aria-hidden="true">
          <div className="db-card-progress-fill" style={{ width: `${card.progress}%` }} />
        </div>
      )}
    </Link>
  )
}

function Column({ title, count, note, cards, empty }) {
  return (
    <div className="db-column">
      <div className="db-column-head">
        <span className="db-column-title">{title}</span>
        <span className="mono db-column-count">{count}</span>
      </div>
      {note && <div className="db-column-note">{note}</div>}
      <div className="db-column-body">
        {cards.length === 0 && <div className="db-card-empty">{empty}</div>}
        {cards.map((c) => <Card key={c.id} card={c} />)}
      </div>
    </div>
  )
}

export default function DispatchBoard() {
  const { data, error, loading } = useResource((signal) => getLoadBoard(signal), [], { pollMs: POLL_MS })

  if (loading && !data) return <div className="panel page-empty">Loading the board…</div>
  if (error && !data) return <div className="panel page-empty">Could not load the board — {error.message}</div>
  if (!data) return null

  const stopped = data.inTransit.filter((c) => c.stopped).length

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Dispatch Board</div>
          <div className="page-sub">
            The run, left to right · {stopped} truck{stopped !== 1 ? 's' : ''} stopped on a road event
          </div>
        </div>
      </div>

      <div className="db-grid">
        <Column
          title="Available"
          count={data.available.length}
          cards={data.available}
          empty="Nothing waiting. Book something on the Load Board."
        />
        <Column
          title="Assigned"
          count={data.assigned.length}
          note="driver paired, log not rolling yet"
          cards={data.assigned}
          empty="Nothing assigned."
        />
        <Column
          title="In Transit"
          count={data.inTransit.length}
          cards={data.inTransit}
          empty="Nothing on the road."
        />
        <Column
          title="Delivered"
          count={data.delivered.length}
          cards={data.delivered}
          empty="No history yet."
        />
      </div>

      <div className="hos-footnote">
        Assigned is the ELD's own window: dispatched, but the driver's log has no driving minute
        yet — owed rest at the origin lives here. Times run on the company calendar, one day
        every two minutes.
      </div>
    </>
  )
}
