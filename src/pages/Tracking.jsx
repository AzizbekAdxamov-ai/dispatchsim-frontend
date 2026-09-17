import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Truck, Warning } from '@phosphor-icons/react'
import { getTrackingBoard, getTrackingMapReference } from '../api/tracking'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatPlace, formatEta } from '../utils/format'
import { STATUS_LABEL } from '../data/mockData'

// FleetMap is loaded on demand, and so is MapLibre with it. MapLibre is
// about a megabyte minified -- more than the rest of this app put together
// -- and a static import puts all of it in the entry bundle, which means
// the login page downloads a map engine it will never draw. Splitting it
// here keeps Tracking's list, detail strip and empty state rendering
// immediately while the map arrives; every other route stops paying for it
// entirely. Same reasoning as the commit that took the 9 MB image off the
// login page: the cost is real, it is just harder to see in a bundle.
//
// MapLibre's own stylesheet rides along inside FleetMap.jsx rather than
// here, so it is fetched with the chunk that needs it.
const FleetMap = lazy(() => import('../components/tracking/FleetMap'))
import '../components/dashboard/Panel.css'
import './Tracking.css'

// Where is everything, right now.
//
// The board answers three questions per load: where is it (the map dot),
// how far along (the bar), and is it late (the badge). All three come from
// the same computed position server-side, so they cannot disagree. Polling
// every 10s moves dots smoothly -- the clock compresses a sim day into two
// real minutes, so a poll much slower than that reads as a frozen board.

const POLL_MS = 10000

export default function Tracking() {
  const [userSelected, setUserSelected] = useState(null)

  const { data, error, loading, refreshing } = useResource(
    (signal) => getTrackingBoard(signal), [], { pollMs: POLL_MS },
  )

  const loads = useMemo(() => data?.loads ?? [], [data])

  // The city layer is fetched once and never polled: it only changes when
  // cities.js does, which is a deploy. Its own request rather than a field
  // on the board, so the 10s poll does not re-send 61 unchanging entries.
  // A failure here leaves the map without dots but still drawn -- the
  // fleet is what the page is for, and it does not depend on this.
  const { data: mapRef } = useResource((signal) => getTrackingMapReference(signal), [])
  const cities = useMemo(() => mapRef?.cities ?? [], [mapRef])

  // Selection defaults to the head of the list (server-ordered by ETA -- the
  // soonest delivery is the one dispatch looks at first) and then stays put:
  // re-selecting on every poll would yank the map around. Derived during
  // render rather than set in an effect -- when the data lands, `selected`
  // IS the first id until the user clicks something else.
  const firstId = loads[0]?.id ?? null
  const selected = userSelected ?? firstId

  const selectedLoad = loads.find((l) => l.id === selected) ?? null

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

  return (
    <div className="tracking-page">
      <div className="page-head">
        <div>
          <div className="page-title">Tracking</div>
          <div className="page-sub">
            Every load on the road, where it is, and how far along
          </div>
        </div>
        <div className="tracking-head-meta">
          <span className={'tracking-refresh' + (refreshing ? ' on' : '')} aria-hidden="true" />
          <span className="page-result-count">
            {loading ? '…' : `${meta?.count ?? 0} in transit`}
            {!loading && meta?.lateCount > 0 && ` · ${meta.lateCount} late`}
          </span>
        </div>
      </div>

      {!loading && excludedNote && (
        <div className="tracking-excluded-note">{excludedNote}</div>
      )}

      {/* Not `!loading && error`: a refetch that starts while an error is
          still set would otherwise leave the page blank -- no error panel and
          no grid. An error on screen during a reload is the true state. */}
      {error && (
        <div className="panel">
          <div className="page-empty">Could not load tracking — {error.message}</div>
        </div>
      )}

      {/* The map is this page's subject, so it stays on screen with an empty
          fleet and while the first poll is still in flight. The outline is a
          constant, not data: hiding it made the whole panel appear and
          disappear under the reader every time the last load was delivered,
          and an outline with no markers already states the fact that nothing
          is moving. Only an error replaces the map, because then there is no
          fleet to be honest about. */}
      {!error && (
        <div className="tracking-grid">
          <div className="panel tracking-map-panel">
            <div className="panel-head">
              <div className="panel-title">Fleet map</div>
              {meta?.openEventCount > 0 && (
                <span className="tracking-open-events">
                  <Warning size={12} weight="fill" aria-hidden="true" />
                  {meta.openEventCount} open road event{meta.openEventCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="tracking-map">
              <Suspense fallback={<div className="tracking-map-loading">Loading map…</div>}>
                <FleetMap
                  loads={loads}
                  cities={cities}
                  selected={selected}
                  onSelect={setUserSelected}
                />
              </Suspense>
              {!loading && loads.length === 0 && (
                <div className="tracking-map-empty">
                  <MapPin size={32} weight="thin" className="tracking-empty-icon" />
                  <div className="tracking-empty-title">No active shipments to track.</div>
                  <div className="tracking-empty-sub">
                    Dispatch a load to see it move here.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Load list: the same facts, one row each, selectable */}
          <div className="panel tracking-list-panel">
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
                    <div className="tracking-row-unit">
                      {load.driver ? (
                        <>
                          <Truck size={12} aria-hidden="true" />
                          {load.driver.name}
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

          {/* Detail strip: the selected load's numbers, no new fetches */}
          {selectedLoad && (
            <div className="panel tracking-detail">
              <div className="tracking-detail-head">
                <div>
                  <div className="tracking-detail-title">
                    <span className="mono">#{selectedLoad.id}</span>
                    <Link to={'/loads/' + selectedLoad.id} className="tracking-detail-link">Open load</Link>
                  </div>
                  <div className="tracking-detail-route">
                    {formatPlace(selectedLoad.originCity, selectedLoad.originState)}
                    <span className="arrow">→</span>
                    {formatPlace(selectedLoad.destinationCity, selectedLoad.destinationState)}
                    <span className="tracking-detail-distance mono">
                      {selectedLoad.distanceMi.toLocaleString('en-US')} mi contracted
                    </span>
                  </div>
                </div>
                <span className={'badge ' + (selectedLoad.late ? 'crit' : 'ontime')}>
                  <span className="dot" />
                  {selectedLoad.late ? STATUS_LABEL.crit : STATUS_LABEL.ontime}
                </span>
              </div>
              <div className="tracking-detail-stats">
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
      )}
    </div>
  )
}
