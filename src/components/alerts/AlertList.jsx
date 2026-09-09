import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, ArrowCounterClockwise } from '@phosphor-icons/react'
import './AlertList.css'

// One shared list, used by the Alerts page and the top-bar panel.
//
// There are no severity colours here, and that is deliberate. The board
// this project deleted had a green/amber/red deadhead scale and a
// fabricated risk score, and both told the student what to conclude before
// they had looked at anything. An alert states what happened; the money at
// stake is printed as a number, and the ordering follows it, so the reason
// a row sits near the top is visible rather than assigned.

function formatUsd(n) {
  if (!n) return null
  return `$${Math.abs(n).toLocaleString('en-US')}`
}

export default function AlertList({ alerts, onAck, onUnack, busyKey, emptyLabel }) {
  if (alerts.length === 0) {
    return <div className="alert-list-empty">{emptyLabel}</div>
  }

  return (
    <ul className="alert-list">
      {alerts.map((a) => {
        const stake = formatUsd(a.stakeUsd)
        const busy = busyKey === a.key
        return (
          <li className="alert-row" key={a.key}>
            <div className="alert-row-body">
              <div className="alert-row-title">{a.title}</div>
              <div className="alert-row-detail">{a.detail}</div>
            </div>
            {/* What is at stake, not how bad it is. */}
            {stake && <div className="alert-row-stake mono">{stake}</div>}
            <div className="alert-row-actions">
              <Link className="alert-row-link" to={a.href} title="Open">
                <ArrowUpRight size={15} />
              </Link>
              {onAck && (
                <button
                  className="alert-row-btn"
                  onClick={() => onAck(a)}
                  disabled={busy}
                  title="Acknowledge — comes back if the situation changes"
                >
                  <Check size={15} />
                </button>
              )}
              {onUnack && (
                <button
                  className="alert-row-btn"
                  onClick={() => onUnack(a)}
                  disabled={busy}
                  title="Un-acknowledge"
                >
                  <ArrowCounterClockwise size={15} />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
