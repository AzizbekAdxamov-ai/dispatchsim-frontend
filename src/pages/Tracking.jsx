import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowsInSimple, ArrowsOutSimple, Park, Truck, Warning } from '@phosphor-icons/react'
import { getLoadRoute, getTrackingBoard, getTrackingMapReference } from '../api/tracking'
import { listFacilities } from '../api/facilities'
import { useResource } from '../hooks/useResource'
import { formatEta, formatHos, formatMoney, formatPlace } from '../utils/format'
import { STATUS_LABEL } from '../data/mockData'

// FleetMap is loaded on demand, and so is MapLibre with it. MapLibre is
// about a megabyte minified -- more than the rest of this app put together
// -- and a static import puts all of it in the entry bundle, which means
// the login page downloads a map engine it will never draw. Splitting it
// here keeps the panel's search, list and detail rendering immediately
// while the map arrives; every other route stops paying for it entirely.
//
// MapLibre's own stylesheet rides along inside FleetMap.jsx rather than
// here, so it is fetched with the chunk that needs it.
const FleetMap = lazy(() => import('../components/tracking/FleetMap'))
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Tracking.css'

// Where is everything, right now -- full-screen map, one fixed panel.
//
// The floating cards that used to cover the map (including its own
// OpenStreetMap attribution) and part of the fleet underneath them are
// gone: a fixed-width panel sits beside a map that owns the rest of the
// page, Google-Maps style -- nothing floats over the map except MapLibre's
// own controls (and the one button that brings the panel back once it's
// been collapsed).
//
// The board answers three questions per load: where is it (the map dot),
// how far along (the bar), and is it late (the badge). All three come from
// the same computed position server-side, so they cannot disagree. Polling
// every 10s moves dots smoothly -- the clock compresses a sim day into two
// real minutes, so a poll much slower than that reads as a frozen board.

const POLL_MS = 10000

export default function Tracking() {
  const [userSelected, setUserSelected] = useState(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const { data, error, loading, refreshing } = useResource(
    (signal) => getTrackingBoard(signal), [], { pollMs: POLL_MS },
  )

  const loads = useMemo(() => data?.loads ?? [], [data])
  // The trucks with nothing on them -- the board names them separately so
  // a fresh-start company (one truck, no loads) still has a fleet on this
  // page instead of an empty country.
  const idleTrucks = useMemo(() => data?.idleTrucks ?? [], [data])

  // The city layer is fetched once and never polled: it only changes when
  // cities.js does, which is a deploy. Its own request rather than a field
  // on the board, so the 10s poll does not re-send 61 unchanging entries.
  // A failure here leaves the map without dots but still drawn -- the
  // fleet is what the page is for, and it does not depend on this.
  const { data: mapRef } = useResource((signal) => getTrackingMapReference(signal), [])
  const cities = useMemo(() => mapRef?.cities ?? [], [mapRef])

  // The road's own services, drawn under the fleet. One fetch: the
  // generator writes them, nothing at runtime moves one (api/facilities.js).
  const { data: facilitiesData, error: facilitiesError } = useResource((signal) => listFacilities(signal), [])
  const facilities = useMemo(() => facilitiesData?.facilities ?? [], [facilitiesData])

  // Selection defaults to the head of the list (server-ordered by ETA -- the
  // soonest delivery is the one dispatch looks at first) and then stays put:
  // re-selecting on every poll would yank the map around. Derived during
  // render rather than set in an effect -- when the data lands, `selected`
  // IS the first id until the user clicks something else.
  const firstId = loads[0]?.id ?? null
  const selected = userSelected ?? firstId

  const selectedLoad = loads.find((l) => l.id === selected) ?? null

  // ---- full road geometry for the SELECTED load only ----
  //
  // The board poll never carries more than the simplified copy
  // (tracking.service.js's BOARD_TOLERANCE_MI) -- accurate enough for
  // the whole-country view, visibly cut-corner once a dispatcher zooms
  // in on the one load they actually picked. Fetched once per load id,
  // not on every 10s poll: keyed by id in a plain object cache, so
  // re-selecting an id already fetched (or re-polling while the same id
  // stays selected) never re-fetches it -- the effect below only depends
  // on `selected`, and `loads` refreshing in place does not change that
  // value.
  const [fullRoutes, setFullRoutes] = useState({})
  const fullRouteSeqRef = useRef(0)

  useEffect(() => {
    if (selected == null || fullRoutes[selected]) return
    const seq = ++fullRouteSeqRef.current
    const controller = new AbortController()
    getLoadRoute(selected, controller.signal).then((res) => {
      if (seq !== fullRouteSeqRef.current) return // a newer selection already landed
      setFullRoutes((prev) => ({ ...prev, [selected]: { status: 'ready', geometry: res.geometry } }))
    }).catch((err) => {
      if (seq !== fullRouteSeqRef.current || err.name === 'AbortError') return
      // Loud, not silent: the map keeps drawing the simplified line it
      // already has (FleetMap.jsx's selectedLaneGeoJSON falls back to it
      // automatically), but the detail panel below states the fact
      // instead of quietly showing a coarser line with no explanation.
      setFullRoutes((prev) => ({ ...prev, [selected]: { status: 'error', error: err } }))
    })
    return () => controller.abort()
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps -- fullRoutes is read, not depended on: including it would re-run this effect every time the cache is WRITTEN, which is the exact re-fetch-on-every-poll this cache exists to prevent.

  const selectedFullGeometry = selected != null && fullRoutes[selected]?.status === 'ready'
    ? fullRoutes[selected].geometry
    : null
  const selectedFullGeometryError = selected != null ? fullRoutes[selected]?.error ?? null : null

  const meta = data?.meta

  // Facts, not a verdict: a load can miss the board because its lane runs
  // through a city outside the seed's closed set, or because its
  // eta_at/dispatched_at pair can't produce a fraction (see
  // tracking.service.js's excludeReason). Stating which, and how many,
  // beats letting the load vanish from the list with nothing said -- the
  // same reasoning as loadBoard.repository.js's "loud, not silent" guard.
  const excludedNote = useMemo(() => {
    if (!meta?.excludedCount) return null
    const reasons = meta.excludedReasons ?? {}
    const parts = []
    if (reasons['unmapped-city']) {
      parts.push(`${reasons['unmapped-city']} with a lane endpoint outside the mapped city set`)
    }
    if (reasons['bad-eta']) {
      parts.push(`${reasons['bad-eta']} with no usable dispatch/ETA window`)
    }
    const plural = meta.excludedCount > 1
    return `${meta.excludedCount} load${plural ? 's are' : ' is'} not on this map`
      + (parts.length > 0 ? ` — ${parts.join('; ')}.` : '.')
  }, [meta])

  // Finding a road from A to B lives on Dispatch > Routes (RoutePlanner.jsx)
  // now -- the planner does it with HOS stops and costs. This page is the
  // fleet on the road and nothing else.

  return (
    <div className="tracking-page">
      <div className={'tracking-layout' + (panelCollapsed ? ' panel-collapsed' : '')}>
        <aside className="tracking-panel" aria-label="Fleet list">
          <div className="tracking-panel-scroll">
            <div className="tracking-panel-head">
              <div>
                <div className="page-title">Tracking</div>
                <div className="page-sub">
                  Every load on the road, where it is, and how far along
                </div>
              </div>
              <button
                type="button"
                className="tracking-panel-collapse"
                onClick={() => setPanelCollapsed(true)}
                aria-label="Collapse panel"
                title="Collapse panel"
              >
                <ArrowsInSimple size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="tracking-head-meta">
              <span className={'tracking-refresh' + (refreshing ? ' on' : '')} aria-hidden="true" />
              <span className="page-result-count">
                {loading ? '…' : `${meta?.count ?? 0} in transit`}
                {!loading && meta?.lateCount > 0 && ` · ${meta.lateCount} late`}
              </span>
              {meta?.openEventCount > 0 && (
                <span className="tracking-open-events">
                  <Warning size={12} weight="fill" aria-hidden="true" />
                  {meta.openEventCount} open road event{meta.openEventCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {!loading && excludedNote && (
              <div className="tracking-excluded-note">{excludedNote}</div>
            )}

            {/* Not `!loading && error`: a refetch that starts while an error
                is still set would otherwise leave the panel blank -- no
                error line and nothing else. An error on screen during a
                reload is the true state. */}
            {error && (
              <div className="page-empty">Could not load tracking — {error.message}</div>
            )}

            {facilitiesError && (
              <div className="tracking-excluded-note">
                Stops could not be loaded — {facilitiesError.message}
              </div>
            )}

            <div className="tracking-panel-section">
              <div className="panel-head">
                <div className="panel-title">On the road</div>
                <span className="panel-count">{loading ? '…' : loads.length}</span>
              </div>
              <div className="tracking-list">
                {loading && <div className="page-empty">Loading shipments…</div>}
                {!loading && loads.length === 0 && (
                  <div className="page-empty">Nothing on the road right now.</div>
                )}
                {loads.map((load) => {
                  const isSelected = load.id === selected
                  return (
                    <motion.button
                      type="button"
                      key={load.id}
                      layout
                      className={'tracking-row' + (isSelected ? ' selected' : '') + (load.late ? ' late' : '')}
                      onClick={() => setUserSelected(load.id)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className="tracking-row-top">
                        <span className="tracking-row-id mono">
                          <Link
                            to={'/loads/' + load.id}
                            className="row-primary-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{load.id}
                          </Link>
                          {load.openEvent && (
                            <Link
                              to={'/loads/' + load.id}
                              className="tracking-stopped-tag"
                              title="The truck is stopped until this road event is answered"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Warning size={11} weight="fill" aria-hidden="true" />
                              Stopped
                            </Link>
                          )}
                        </span>
                        <span className={'badge ' + (load.late ? 'crit' : 'ontime')}>
                          <span className="dot" />
                          {load.late ? STATUS_LABEL.crit : STATUS_LABEL.ontime}
                        </span>
                      </div>
                      <div className="tracking-row-route">
                        {formatPlace(load.originCity, load.originState)}
                        <span className="arrow">→</span>
                        {formatPlace(load.destinationCity, load.destinationState)}
                      </div>
                      <div className="tracking-row-progress-track">
                        <motion.div
                          className={'tracking-row-progress-fill' + (load.late ? ' late' : '')}
                          initial={false}
                          animate={{ width: `${Math.round(load.progress * 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="tracking-row-bottom">
                        <span className="tracking-row-progress mono">
                          {Math.round(load.progress * 100)}% · {load.distanceRemainingMi.toLocaleString('en-US')} mi left
                        </span>
                        <span className="tracking-row-eta mono">{formatEta(load.etaAt)}</span>
                      </div>
                      {/* The truck's state at a glance: stopped at a planned
                          stop with the clock that owns the stop running, or
                          the driver's drive hours left. Both are facts the
                          board already computed server-side; neither is a
                          verdict on the dispatcher. */}
                      {load.currentStop && (
                        <div className={'tracking-row-stop' + (load.currentStop.reason === 'rest' ? ' rest' : '')}>
                          <Park size={12} aria-hidden="true" />
                          <span>
                            {load.currentStop.reason === 'rest' ? 'Resting' : load.currentStop.reason === 'fuel' ? 'Fueling' : 'Stopped'}
                            {load.currentStop.facilityName ? ` at ${load.currentStop.facilityName}` : ' on the shoulder'}
                          </span>
                        </div>
                      )}
                      <div className="tracking-row-unit">
                        {load.driver ? (
                          <>
                            <Truck size={12} aria-hidden="true" />
                            {load.driver.name}
                            {load.driver.hosRemainingMin != null && (
                              <span className="tracking-row-hos mono">· {formatHos(load.driver.hosRemainingMin)} drive</span>
                            )}
                            {load.truck ? ` · ${load.truck.make} ${load.truck.model}` : ''}
                          </>
                        ) : (
                          <span className="tracking-row-nodriver">No driver</span>
                        )}
                        <span className="tracking-row-rate mono">{formatMoney(load.rateUsd)}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* The yard: trucks with nothing on them. Listed so the fleet
                count on this page is the whole fleet, and selectable so a
                click highlights the same dot the map draws. */}
            {!loading && idleTrucks.length > 0 && (
              <div className="tracking-panel-section">
                <div className="panel-head">
                  <div className="panel-title">In the yard</div>
                  <span className="panel-count">{idleTrucks.length}</span>
                </div>
                <div className="tracking-list">
                  {idleTrucks.map((t) => (
                    <div className="tracking-row idle" key={t.id}>
                      <div className="tracking-row-top">
                        <span className="tracking-row-id mono">{t.id}</span>
                        <span className="badge neutral"><span className="dot" />Idle</span>
                      </div>
                      <div className="tracking-row-route">
                        {t.truck.make} {t.truck.model}
                        {t.city ? ` — ${t.city}, ${t.state}` : ''}
                      </div>
                      <div className="tracking-row-unit">
                        {t.driver ? (
                          <>
                            <Truck size={12} aria-hidden="true" />
                            {t.driver.name}
                            {t.driver.hosRemainingMin != null && (
                              <span className="tracking-row-hos mono">· {formatHos(t.driver.hosRemainingMin)} drive</span>
                            )}
                          </>
                        ) : (
                          <span className="tracking-row-nodriver">No load assigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected load's own facts -- no new fetches, same numbers
                the row above already carries. */}
            {selectedLoad && (
              <div className="tracking-panel-detail">
                <div className="tracking-panel-detail-head">
                  <div>
                    <div className="tracking-panel-detail-title">
                      <span className="mono">#{selectedLoad.id}</span>
                      <Link to={'/loads/' + selectedLoad.id} className="tracking-detail-link">Open load</Link>
                    </div>
                    <div className="tracking-panel-detail-route">
                      {formatPlace(selectedLoad.originCity, selectedLoad.originState)}
                      <span className="arrow">→</span>
                      {formatPlace(selectedLoad.destinationCity, selectedLoad.destinationState)}
                    </div>
                    <div className="tracking-panel-detail-distance mono">
                      {selectedLoad.distanceMi.toLocaleString('en-US')} mi contracted
                    </div>
                  </div>
                  <span className={'badge ' + (selectedLoad.late ? 'crit' : 'ontime')}>
                    <span className="dot" />
                    {selectedLoad.late ? STATUS_LABEL.crit : STATUS_LABEL.ontime}
                  </span>
                </div>
                <div className="tracking-panel-detail-stats">
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">Progress</div>
                    <div className="tracking-detail-val mono">{Math.round(selectedLoad.progress * 100)}%</div>
                  </div>
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">Remaining</div>
                    <div className="tracking-detail-val mono">
                      {selectedLoad.distanceRemainingMi.toLocaleString('en-US')} mi
                    </div>
                  </div>
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">ETA</div>
                    <div className="tracking-detail-val mono">{formatEta(selectedLoad.etaAt, selectedLoad.promisedEtaAt) ?? '—'}</div>
                  </div>
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">Driver</div>
                    <div className="tracking-detail-val">{selectedLoad.driver?.name ?? '—'}</div>
                  </div>
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">Truck</div>
                    <div className="tracking-detail-val">
                      {selectedLoad.truck ? `${selectedLoad.truck.make} ${selectedLoad.truck.model}` : '—'}
                    </div>
                  </div>
                  <div className="tracking-detail-stat">
                    <div className="tracking-detail-key">Rate</div>
                    <div className="tracking-detail-val mono">{formatMoney(selectedLoad.rateUsd)}</div>
                  </div>
                </div>
                {/* Fact, not a verdict: this load's marker walked the
                    great-circle fallback, not a real road, because no one
                    has searched this lane yet (position.js's
                    geometrySource). Stated in words -- the line on the map
                    itself stays the same color and weight either way, see
                    FleetMap.jsx's lanesToGeoJSON. */}
                {selectedLoad.geometrySource === 'arc' && (
                  <div className="tracking-panel-detail-note">
                    Straight-line estimate — no road route stored for this lane.
                  </div>
                )}
                {/* Loud, not silent: the map is still drawing SOMETHING for
                    this lane (the simplified board line, or the arc note
                    above) -- this states why it is not the full-resolution
                    road, the same "fact, not a verdict" framing as the
                    arc note. */}
                {selectedFullGeometryError && (
                  <div className="tracking-panel-detail-note">
                    Full-resolution road unavailable — showing the lighter
                    line from the board. {selectedFullGeometryError.message}
                  </div>
                )}
                {selectedLoad.openEvent && (
                  <div className="tracking-detail-stopped">
                    <Warning size={14} weight="fill" aria-hidden="true" />
                    <span>
                      Stopped by a road event — the truck does not move until it is answered.
                    </span>
                    <Link to={'/loads/' + selectedLoad.id} className="tracking-detail-link">Resolve</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="tracking-map-pane">
          <Suspense fallback={<div className="tracking-map-loading">Loading map…</div>}>
            <FleetMap
              loads={loads}
              idleTrucks={idleTrucks}
              cities={cities}
              facilities={facilities}
              selected={selected}
              onSelect={setUserSelected}
              selectedFullGeometry={selectedFullGeometry}
            />
          </Suspense>
          {/* The one thing allowed to float over the map besides MapLibre's
              own controls: the way back in once the panel is collapsed. */}
          {panelCollapsed && (
            <button
              type="button"
              className="tracking-map-expand"
              onClick={() => setPanelCollapsed(false)}
              aria-label="Show panel"
              title="Show panel"
            >
              <ArrowsOutSimple size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
