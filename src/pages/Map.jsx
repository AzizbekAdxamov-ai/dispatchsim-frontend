import { lazy, Suspense } from 'react'
import { getTrackingBoard, getTrackingMapReference } from '../api/tracking'
import { listFacilities } from '../api/facilities'
import { useResource } from '../hooks/useResource'
// MapLibre rides along inside FleetMap.jsx (about a megabyte minified) --
// lazy keeps it out of every other route's bundle, same as Tracking does.
import './Tracking.css'
import './MapPage.css'

const FleetMap = lazy(() => import('../components/tracking/FleetMap'))

// The fleet map, on its own page. Not an overview, not a tab, not part of
// any section in the sidebar -- the top bar's Map button lands here from
// any page, and the whole screen is the map: nothing floats over it but
// MapLibre's own controls.
//
// The board poll runs because the dots ARE the fleet: every 10s the same
// server-computed positions Tracking's list shows move the markers. Cities
// and road stops are one fetch each -- they change only with a deploy, so
// they are never polled. There is no list beside the map to select from:
// clicking a truck previews its load in the map's own popup, which is the
// one interaction a full-screen map needs.
export default function Map() {
  const { data } = useResource((signal) => getTrackingBoard(signal), [], { pollMs: 10000 })
  const { data: mapRef } = useResource((signal) => getTrackingMapReference(signal), [])
  const { data: facilitiesData } = useResource((signal) => listFacilities(signal), [])

  const loads = data?.loads ?? []
  const cities = mapRef?.cities ?? []
  const facilities = facilitiesData?.facilities ?? []

  return (
    <div className="tracking-page map-page">
      <div className="map-page-pane">
        <Suspense fallback={<div className="tracking-map-loading">Loading map…</div>}>
          <FleetMap loads={loads} cities={cities} facilities={facilities} />
        </Suspense>
      </div>
    </div>
  )
}
