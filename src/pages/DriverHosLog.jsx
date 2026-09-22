import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { getDriverDayLog } from '../api/compliance'
import { useResource } from '../hooks/useResource'
import EldLogGrid from '../components/compliance/EldLogGrid'
import { segmentsForDay, totalsForDay } from '../components/compliance/eldLog'
import { dutyStatusLabel, formatClock, DUTY_STATUSES } from '../components/compliance/dutyStatus'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'
import './DriverHosLog.css'

// A driver's event log for one day: the duty-status grid and the events
// behind it. Day 0 is today; the previous 7 days are reachable -- the
// window a driver must be able to show at roadside (49 CFR 395.8(k)(2)).

const POLL_MS = 3000
const OLDEST_DAY = -7

// A compressed-calendar timestamp as the time of day on the log's own
// 24-hour grid. Outside the day it is marked, not silently wrapped.
function timeOfDay(iso, dayStartMs, dayEndMs) {
  const t = new Date(iso).getTime()
  const span = dayEndMs - dayStartMs
  const min = Math.round(((t - dayStartMs) / span) * 24 * 60)
  if (min < 0) return 'prev day'
  if (min >= 24 * 60) return 'next day'
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function hosMinutes(fromIso, toIso, dayStartMs, dayEndMs) {
  return ((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (dayEndMs - dayStartMs)) * 24 * 60
}

function location(e) {
  if (e.facility) return `${e.facility.name} · ${e.facility.city}, ${e.facility.state}`
  if (e.routeOffsetMi != null) return `Mile ${e.routeOffsetMi} of load ${e.loadId ?? '—'}`
  return '—'
}

export default function DriverHosLog() {
  const { driverId } = useParams()
  const [day, setDay] = useState(0)

  const { data, error, loading } = useResource(
    (signal) => getDriverDayLog(driverId, day, signal),
    [driverId, day],
    { pollMs: day === 0 ? POLL_MS : undefined },
  )

  const dayStartMs = data?.dayStart ? new Date(data.dayStart).getTime() : null
  const dayEndMs = data?.dayEnd ? new Date(data.dayEnd).getTime() : null
  const nowMs = data?.now ? new Date(data.now).getTime() : null
  const ready = data && dayStartMs != null && dayEndMs != null && nowMs != null
  const totals = ready ? totalsForDay(segmentsForDay(data.events, dayStartMs, dayEndMs, nowMs)) : null

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{data?.driver?.name ?? 'Driver'} · Event Log</div>
          <div className="page-sub">
            <Link to="/compliance/hos" className="hos-back">Driver HOS</Link> / Record of duty status
          </div>
        </div>
        <div className="hos-day-nav">
          <button type="button" className="icon-btn" onClick={() => setDay((d) => Math.max(OLDEST_DAY, d - 1))} disabled={day <= OLDEST_DAY} aria-label="Previous day">
            <CaretLeft size={15} />
          </button>
          <span className="hos-day-label">{day === 0 ? 'Today' : day === -1 ? 'Yesterday' : `${-day} days ago`}{data?.day ? ` · ${data.day}` : ''}</span>
          <button type="button" className="icon-btn" onClick={() => setDay((d) => Math.min(0, d + 1))} disabled={day >= 0} aria-label="Next day">
            <CaretRight size={15} />
          </button>
        </div>
      </div>

      {loading && <div className="panel page-empty">Loading the log…</div>}
      {!loading && error && <div className="panel page-empty">Could not load the log — {error.message}</div>}
      {!loading && !error && !ready && (
        <div className="panel page-empty">The company calendar has not started yet, so there is no day to show.</div>
      )}

      {!loading && !error && ready && (
        <>
          <div className="panel hos-grid-panel">
            <EldLogGrid events={data.events} dayStart={data.dayStart} dayEnd={data.dayEnd} now={data.now} />
            <div className="hos-grid-legend">
              <span><span className="hos-swatch recorded" /> Recorded</span>
              <span><span className="hos-swatch planned" /> Planned for the rest of the run</span>
              <span className="hos-grid-total">
                Recorded today: {DUTY_STATUSES.map((s) => `${s.short} ${formatClock(totals[s.key])}`).join(' · ')}
              </span>
            </div>
          </div>

          <div className="panel load-board hos-table">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Location</th>
                  <th>Load</th>
                  <th>Origin</th>
                </tr>
              </thead>
              <tbody>
                {data.events.length === 0 && (
                  <tr><td colSpan={7} className="page-empty">No duty status recorded on this day.</td></tr>
                )}
                {data.events.map((e) => {
                  const planned = new Date(e.startedAt).getTime() >= nowMs
                  return (
                    <tr key={e.id} className={planned ? 'hos-planned-row' : undefined}>
                      <td>{dutyStatusLabel(e.status)}{planned && <span className="hos-muted"> (planned)</span>}</td>
                      <td className="mono">{timeOfDay(e.startedAt, dayStartMs, dayEndMs)}</td>
                      <td className="mono">{timeOfDay(e.endedAt, dayStartMs, dayEndMs)}</td>
                      <td className="mono">{formatClock(hosMinutes(e.startedAt, e.endedAt, dayStartMs, dayEndMs))}</td>
                      <td>{location(e)}</td>
                      <td className="mono">{e.loadId ? <Link to={`/loads/${e.loadId}`}>#{e.loadId}</Link> : '—'}</td>
                      <td>{e.origin === 'automatic' ? 'Automatic' : e.origin}{e.annotation ? ` · ${e.annotation}` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
