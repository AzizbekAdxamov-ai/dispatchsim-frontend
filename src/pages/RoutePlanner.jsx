import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, XCircle } from '@phosphor-icons/react'
import { planTrip } from '../api/trips'
import { getTrackingMapReference, searchLane } from '../api/tracking'
import { formatClock } from '../components/compliance/dutyStatus'
import './RoutePlanner.css'

// Dispatch > Routes. The truck route planner's own layout and flow
// (Truck Information -> Trip Waypoints -> Run Trip; then Trip Summary,
// Trip Reports, Go Back / Reset Trip; map on the right), from Azizbek's
// TruckRouter screenshots (2026-09-21). Only what this project can
// honestly compute is on it:
//   - kept: max speed, MPG, $/gal, cost per mile, cost per hour, up to 5
//     stops between Start and End, the summary's miles/hours/costs.
//   - left out, and said so on the page: truck dimensions, axles, hazmat,
//     toll/ferry/tunnel avoidance, route type, tolls, elevation, state
//     mileage. The road network used here (OSRM) has no truck
//     restrictions and no toll data; a field that changed nothing would
//     be a lie on the screen.
//   - added: the HOS-legal stops (facilities/stopPlan.js). A planner that
//     only showed driving time would promise an arrival the law forbids.

const RouteMap = lazy(() => import('../components/routes/RouteMap'))

const STOP_ROWS = 5
const EMPTY_WAYPOINTS = ['', ...Array(STOP_ROWS).fill(''), '']
const MAX_MPH = ['', '55', '60', '65', '70', '75', '80']

function hoursMinutes(min) {
  if (min == null) return '—'
  const m = Math.round(min)
  return `${Math.floor(m / 60)} hours ${m % 60} minutes`
}

function money(x) {
  if (x == null) return '—'
  return `$ ${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const REPORTS = [
  { key: 'legs', label: 'Legs Itinerary' },
  { key: 'stops', label: 'Truck Stops' },
  { key: 'hos', label: 'HOS Plan' },
  { key: 'loads', label: 'Loads on This Lane' },
  { key: 'highways', label: 'Highways' },
  { key: 'settings', label: 'Trip Settings' },
]

// What the ranker means by laneFit, in words. Placing, not judging: a
// posting is not "better" for sharing an end, it is a different thing,
// and the dispatcher decides.
const LANE_FIT = {
  2: 'This lane',
  1: 'Shares one end',
  0: 'Elsewhere',
}

function ratePerMile(x) {
  return x == null ? '—' : `$${x.toFixed(2)}`
}

export default function RoutePlanner() {
  const [waypoints, setWaypoints] = useState(EMPTY_WAYPOINTS)
  const [truck, setTruck] = useState({ maxMph: '', mpg: '6.5', fuelPricePerGal: '4.05', costPerMile: '0', costPerHour: '0' })
  const [cities, setCities] = useState([])
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState('legs')
  // The open board for this trip's own A->B, through the same ranking
  // the fleet map's lane panel used. Fetched when the report is opened,
  // not with the trip: a dispatcher planning a route does not always
  // want to know what else is posted on it, and the postings read is a
  // table scan the trip itself does not need.
  const [lane, setLane] = useState({ key: null, status: 'idle', results: [], error: null })

  useEffect(() => {
    const ctrl = new AbortController()
    getTrackingMapReference(ctrl.signal)
      .then((r) => setCities(r.cities ?? []))
      .catch((e) => { if (e.name !== 'AbortError') setError(`City list could not load — ${e.message}`) })
    return () => ctrl.abort()
  }, [])

  // Loads on this lane. Driven by the click that opens the report rather
  // than by an effect watching `report`: the effect would have to depend
  // on the very state it sets, which is how a fetch ends up running on
  // every render. Re-opening an already-read lane costs nothing; a lane
  // that failed is retried, because the alternative is a report that
  // stays broken until the trip is re-run.
  //
  // The failure is stated in the report body, never only logged -- an
  // empty table would read as "no loads on this lane", which is a
  // different fact.
  function openReport(key) {
    setReport(key)
    if (key !== 'loads' || !trip) return
    const a = trip.waypoints[0]
    const b = trip.waypoints.at(-1)
    const laneKey = `${a.city}, ${a.state}->${b.city}, ${b.state}`
    if (lane.key === laneKey && lane.status === 'ready') return

    setLane({ key: laneKey, status: 'loading', results: [], error: null })
    searchLane({ origin: `${a.city}, ${a.state}`, destination: `${b.city}, ${b.state}` })
      .then((r) => setLane({ key: laneKey, status: 'ready', results: r.results ?? [], error: null }))
      .catch((e) => setLane({ key: laneKey, status: 'error', results: [], error: e.message }))
  }

  const setWp = (i, v) => setWaypoints((w) => w.map((x, j) => (j === i ? v : x)))
  const move = (i, d) => setWaypoints((w) => {
    const j = i + d
    if (j < 0 || j >= w.length) return w
    const next = w.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  async function run(e) {
    e.preventDefault()
    const filled = waypoints.filter((w) => w.trim())
    if (!waypoints[0].trim() || !waypoints[waypoints.length - 1].trim()) {
      setError('Start and End are both needed.')
      return
    }
    setRunning(true)
    setError(null)
    try {
      const res = await planTrip({
        waypoints: filled,
        truck: {
          maxMph: truck.maxMph ? Number(truck.maxMph) : null,
          mpg: Number(truck.mpg),
          fuelPricePerGal: Number(truck.fuelPricePerGal),
          costPerMile: Number(truck.costPerMile),
          costPerHour: Number(truck.costPerHour),
        },
      })
      setTrip(res)
      setReport('legs')
    } catch (err) {
      const which = err.details?.waypoint != null ? ` (“${err.details.query}”)` : ''
      setError(`${err.message}${which}`)
    } finally {
      setRunning(false)
    }
  }

  function reset() {
    setWaypoints(EMPTY_WAYPOINTS)
    setTrip(null)
    setError(null)
  }

  const t = trip?.totals
  const stopsBetween = trip ? trip.waypoints.slice(1, -1) : []

  return (
    <div className="routes-page">
      <div className="routes-panel">
        {!trip && (
          <form onSubmit={run}>
            <div className="routes-section-head">Truck Information</div>
            <div className="routes-truck-grid">
              <label>Max
                <select value={truck.maxMph} onChange={(e) => setTruck({ ...truck, maxMph: e.target.value })}>
                  {MAX_MPH.map((m) => <option key={m} value={m}>{m ? `${m} mph` : 'Road speed'}</option>)}
                </select>
              </label>
              <label>MPG<input type="number" step="0.1" min="3" max="15" value={truck.mpg} onChange={(e) => setTruck({ ...truck, mpg: e.target.value })} /></label>
              <label>$ / G<input type="number" step="0.01" min="0.5" max="15" value={truck.fuelPricePerGal} onChange={(e) => setTruck({ ...truck, fuelPricePerGal: e.target.value })} /></label>
              <label>Cost Per Mile<input type="number" step="0.01" min="0" max="20" value={truck.costPerMile} onChange={(e) => setTruck({ ...truck, costPerMile: e.target.value })} /></label>
              <label>Per Hour<input type="number" step="0.5" min="0" max="500" value={truck.costPerHour} onChange={(e) => setTruck({ ...truck, costPerHour: e.target.value })} /></label>
            </div>
            <div className="routes-note">
              Truck dimensions, hazmat and toll avoidance are not applied: the road network here has no truck restrictions or toll data.
            </div>

            <div className="routes-section-head">Trip Waypoints</div>
            <datalist id="routes-cities">
              {cities.map((c) => <option key={`${c.city}-${c.state}`} value={`${c.city}, ${c.state}`} />)}
            </datalist>
            <div className="routes-waypoints">
              {waypoints.map((w, i) => {
                const label = i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : `Stop ${i}`
                const endpoint = i === 0 || i === waypoints.length - 1
                return (
                  <div key={i} className={'routes-wp' + (endpoint ? ' endpoint' : '')}>
                    <span className="routes-wp-label">{label}</span>
                    <input list="routes-cities" value={w} onChange={(e) => setWp(i, e.target.value)} placeholder={endpoint ? 'City, ST' : ''} aria-label={label} />
                    <button type="button" className="routes-wp-btn" onClick={() => move(i, 1)} aria-label={`Move ${label} down`}><ArrowDown size={12} /></button>
                    <button type="button" className="routes-wp-btn" onClick={() => move(i, -1)} aria-label={`Move ${label} up`}><ArrowUp size={12} /></button>
                    <button type="button" className="routes-wp-btn" onClick={() => setWp(i, '')} aria-label={`Clear ${label}`}><XCircle size={13} /></button>
                  </div>
                )
              })}
            </div>
            {error && <div className="routes-error" role="alert">{error}</div>}
            <div className="routes-actions">
              <button type="submit" className="routes-btn primary" disabled={running}>{running ? 'Running…' : 'Run Trip'}</button>
              <button type="button" className="routes-btn" onClick={reset}>Reset Trip</button>
            </div>
          </form>
        )}

        {trip && (
          <>
            <div className="routes-section-head">Trip Summary</div>
            <div className="routes-summary">
              <div className="routes-row"><span className="routes-key">Vehicle</span><span>Truck · {trip.truck.mpg} MPG{trip.truck.maxMph ? ` · max ${trip.truck.maxMph} mph` : ''} · {trip.tankGal} gal tank</span></div>
              <div className="routes-divider" />
              <div className="routes-row"><span className="routes-pin a">A</span><span className="routes-key">Start</span><span className="routes-grow">{trip.waypoints[0].city}, {trip.waypoints[0].state}</span><span className="routes-dim">0.0 mi</span><span className="routes-dim">0:00 h</span></div>
              <div className="routes-row">
                <span className="routes-pin stop">◆</span><span className="routes-key">Stops</span>
                <span className="routes-grow">
                  {stopsBetween.length === 0
                    ? <span className="routes-dim">There are no stops for this trip</span>
                    : stopsBetween.map((w) => `${w.city}, ${w.state}`).join(' · ')}
                </span>
              </div>
              <div className="routes-row"><span className="routes-pin b">B</span><span className="routes-key">End</span><span className="routes-grow">{trip.waypoints.at(-1).city}, {trip.waypoints.at(-1).state}</span><span className="routes-dim">{trip.waypoints.at(-1).cumulativeMi.toLocaleString('en-US', { minimumFractionDigits: 1 })} mi</span><span className="routes-dim">{formatClock(trip.waypoints.at(-1).cumulativeDrivingMin)} h</span></div>
              <div className="routes-divider" />
              <div className="routes-totals">
                <div><span className="routes-key">Dist</span><span>{t.distanceMi.toLocaleString('en-US', { minimumFractionDigits: 1 })} miles</span></div>
                <div><span className="routes-key">Tolls</span><span className="routes-dim" title="No toll data in this project">—</span></div>
                <div><span className="routes-key">Time</span><span>{hoursMinutes(t.timeMin)}</span></div>
                <div><span className="routes-key">Fuel</span><span>{money(t.fuelUsd)}</span></div>
                <div><span className="routes-key">Stops</span><span>{hoursMinutes(t.stopsMin)}</span></div>
                <div><span className="routes-key">Fixed</span><span>{money(t.fixedUsd)}</span></div>
                <div><span className="routes-key">Driving</span><span>{hoursMinutes(t.drivingMin)}</span></div>
                <div className="routes-total"><span className="routes-key">Total</span><span>{money(t.totalUsd)}</span></div>
              </div>
              <div className="routes-note">Stops = the rests, breaks and fuel stops the HOS-legal plan needs (49 CFR 395). Tolls: no data.</div>
            </div>

            <div className="routes-section-head">Trip Reports</div>
            <div className="routes-report-btns">
              {REPORTS.map((r) => (
                <button key={r.key} type="button" className={'routes-btn' + (report === r.key ? ' active' : '')} onClick={() => openReport(r.key)}>{r.label}</button>
              ))}
            </div>
            <div className="routes-report">
              {report === 'legs' && (
                <table>
                  <thead><tr><th>Leg</th><th>Miles</th><th>Driving</th></tr></thead>
                  <tbody>{trip.legs.map((l, i) => (
                    <tr key={i}><td>{l.from.city}, {l.from.state} → {l.to.city}, {l.to.state}</td><td className="mono">{l.distanceMi.toLocaleString('en-US')}</td><td className="mono">{formatClock(l.drivingMin)}</td></tr>
                  ))}</tbody>
                </table>
              )}
              {report === 'stops' && (
                trip.truckStops.length === 0
                  ? <div className="routes-dim">No stops inside the route corridor. Run npm run facilities:generate for this lane.</div>
                  : <table>
                    <thead><tr><th>Mile</th><th>Stop</th><th>Near</th><th>Diesel</th></tr></thead>
                    <tbody>{trip.truckStops.map((s) => (
                      <tr key={s.id}><td className="mono">{s.mile}</td><td>{s.name}</td><td>{s.city}, {s.state}</td><td className="mono">{s.fuelPriceCents != null ? `$${(s.fuelPriceCents / 100).toFixed(2)}` : '—'}</td></tr>
                    ))}</tbody>
                  </table>
              )}
              {report === 'hos' && (
                <>
                  <table>
                    <thead><tr><th>Mile</th><th>Stop</th><th>Why</th></tr></thead>
                    <tbody>
                      {trip.plannedStops.length === 0 && <tr><td colSpan={3} className="routes-dim">No stop is required on this trip.</td></tr>}
                      {trip.plannedStops.map((s, i) => (
                        <tr key={i}><td className="mono">{s.mile}</td><td>{s.facility ? `${s.facility.name} · ${s.facility.city}, ${s.facility.state}` : 'Roadside'}</td><td>{s.reason === 'fuel' ? `Fuel · ${s.gallons} gal` : 'Rest'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="routes-facts">{trip.hosFacts.map((f, i) => <li key={i}>{f.cfr ? <span className="mono">{f.cfr}</span> : null} {f.detail}</li>)}</ul>
                </>
              )}
              {report === 'loads' && (
                <>
                  {lane.status === 'loading' && <div className="routes-dim">Reading the load board…</div>}
                  {lane.status === 'error' && <div className="routes-error" role="alert">The load board could not be read — {lane.error}</div>}
                  {lane.status === 'ready' && lane.results.length === 0 && (
                    <div className="routes-dim">No open postings on the board right now.</div>
                  )}
                  {lane.status === 'ready' && lane.results.length > 0 && (
                    <>
                      <table>
                        <thead><tr><th>Where</th><th>Lane</th><th>Broker</th><th>Miles</th><th>Rate</th><th>$/mi</th><th>Deadhead</th></tr></thead>
                        <tbody>{lane.results.map((p) => (
                          <tr key={p.id}>
                            <td>{LANE_FIT[p.score.laneFit] ?? '—'}</td>
                            <td>{p.originCity}, {p.originState} → {p.destinationCity}, {p.destinationState}</td>
                            <td>{p.broker}</td>
                            <td className="mono">{p.distanceMi?.toLocaleString('en-US') ?? '—'}</td>
                            <td className="mono">{p.rateHidden ? 'Call' : money(p.rateUsd)}</td>
                            <td className="mono">{p.rateHidden ? '—' : ratePerMile(p.score.ratePerMile)}</td>
                            <td className="mono">{p.score.deadheadMi == null ? '—' : `${p.score.deadheadMi.toLocaleString('en-US')} mi`}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      <div className="routes-note">Open postings, this lane first, then ones sharing an end, then the rest of the board. Deadhead is measured from this trip's Start. Rate is what the broker shows: some postings do not show one.</div>
                    </>
                  )}
                </>
              )}
              {report === 'highways' && (
                <table>
                  <thead><tr><th>Leg</th><th>Highways</th></tr></thead>
                  <tbody>{trip.legs.map((l, i) => (
                    <tr key={i}><td>{l.from.city} → {l.to.city}</td><td>{l.roadRefs.length ? l.roadRefs.join(', ') : '—'}</td></tr>
                  ))}</tbody>
                </table>
              )}
              {report === 'settings' && (
                <table><tbody>
                  <tr><td>Max speed</td><td>{trip.truck.maxMph ? `${trip.truck.maxMph} mph` : 'Road speed'}</td></tr>
                  <tr><td>MPG</td><td>{trip.truck.mpg}</td></tr>
                  <tr><td>$ / gal</td><td>{trip.truck.fuelPricePerGal}</td></tr>
                  <tr><td>Cost per mile</td><td>{trip.truck.costPerMile}</td></tr>
                  <tr><td>Cost per hour</td><td>{trip.truck.costPerHour}</td></tr>
                </tbody></table>
              )}
            </div>
            <div className="routes-actions">
              <button type="button" className="routes-btn primary" onClick={() => setTrip(null)}>Go Back</button>
              <button type="button" className="routes-btn" onClick={reset}>Reset Trip</button>
            </div>
          </>
        )}
      </div>

      <div className="routes-map">
        <Suspense fallback={<div className="routes-map-loading">Loading map…</div>}>
          <RouteMap trip={trip} />
        </Suspense>
      </div>
    </div>
  )
}
