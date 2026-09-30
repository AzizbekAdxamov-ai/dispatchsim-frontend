import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { getTrackingBoard, getTrackingMapReference } from '../api/tracking'
import { listFacilities } from '../api/facilities'
import { useResource } from '../hooks/useResource'
import { formatPlace, formatEta, formatMiles, formatMoney } from '../utils/format'
// MapLibre rides along inside FleetMap.jsx (about a megabyte minified) --
// lazy keeps it out of every other route's bundle, same as Tracking does.
import './Tracking.css'
import './MapPage.css'

const FleetMap = lazy(() => import('../components/tracking/FleetMap'))

// The fleet map, on its own page. Not an overview, not a tab, not part of
// any section in the sidebar -- the top bar's Map button lands here from
// any page, and the whole screen is the map: nothing floats over it but
// MapLibre's own controls and, when a fetch fails, the line that says so.
//
// Named MapPage, not Map: `Map` is a built-in global, and FleetMap.jsx
// already aliases MapLibre's own Map class away from it for that reason.
//
// The board poll runs because the dots ARE the fleet: every 10s the same
// server-computed positions Tracking's list shows move the markers. Cities
// and road stops are one fetch each -- they change only with a deploy, so
// they are never polled.
//
// What makes this page worth having next to /tracking -- which draws the
// same map -- is the direction it is used in. /tracking starts from the
// list and finds the truck; this starts from the truck and gets you out:
// hover names it, click pins a card, the card opens the load. Without the
// click the page was a picture of /tracking's map, and clicking a truck --
// the only thing there is to click -- did nothing at all.
export default function MapPage() {
  const { data, error } = useResource((signal) => getTrackingBoard(signal), [], { pollMs: 10000 })
  const { data: mapRef, error: mapRefError } = useResource((signal) => getTrackingMapReference(signal), [])
  const { data: facilitiesData, error: facilitiesError } = useResource((signal) => listFacilities(signal), [])

  const [selected, setSelected] = useState(null)

  const loads = data?.loads ?? []
  const cities = mapRef?.cities ?? []
  const facilities = facilitiesData?.facilities ?? []
  // By id from the live list, not a copy taken at click time: the poll
  // moves this truck every 10s and the card has to move with it.
  const selectedLoad = loads.find((l) => String(l.id) === String(selected)) ?? null

  // An empty map and a map whose data failed to load look exactly the
  // same, and on this page there is no list beside it to say otherwise --
  // so each fetch that failed says so, in the words the API used.
  // Tracking.jsx does the same for the same reason; a fetch that only
  // returns fewer dots is the failure this project forbids.
  //
  // Stated per source, not as one line: the fleet failing and the road
  // stops failing leave different things missing from the screen.
  const failures = [
    error && `Fleet could not be loaded — ${error.message}`,
    mapRefError && `City list could not be loaded — ${mapRefError.message}`,
    facilitiesError && `Stops could not be loaded — ${facilitiesError.message}`,
  ].filter(Boolean)

  return (
    <div className="tracking-page map-page">
      <div className="map-page-pane">
        <Suspense fallback={<div className="tracking-map-loading">Loading map…</div>}>
          <FleetMap
            loads={loads}
            cities={cities}
            facilities={facilities}
            selected={selected}
            onSelect={setSelected}
          />
        </Suspense>
        {/* The card is facts and a way out, not a verdict: where the load
            is going, how much is left, what the ETA is against what was
            promised, what it pays. Anything more is the load's own page,
            one click away. A load that vanishes from the board (delivered
            between polls) takes its card with it. */}
        {selectedLoad && (
          <div className="map-page-card">
            <div className="map-page-card-head">
              <Link to={`/loads/${selectedLoad.id}`} className="map-page-card-id">#{selectedLoad.id}</Link>
              <button
                type="button"
                className="map-page-card-close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={13} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <div className="map-page-card-route">
              {formatPlace(selectedLoad.originCity, selectedLoad.originState)}
              {' → '}
              {formatPlace(selectedLoad.destinationCity, selectedLoad.destinationState)}
            </div>
            <dl className="map-page-card-grid">
              <div><dt>Remaining</dt><dd className="mono">{formatMiles(selectedLoad.distanceRemainingMi)}</dd></div>
              <div><dt>ETA</dt><dd className="mono">{formatEta(selectedLoad.etaAt, selectedLoad.promisedEtaAt) ?? '—'}</dd></div>
              <div><dt>Rate</dt><dd className="mono">{formatMoney(selectedLoad.rateUsd)}</dd></div>
            </dl>
            <Link to={`/loads/${selectedLoad.id}`} className="map-page-card-link">Open load</Link>
          </div>
        )}
        {failures.length > 0 && (
          <div className="map-page-errors" role="alert">
            {failures.map((line) => <div key={line}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}
