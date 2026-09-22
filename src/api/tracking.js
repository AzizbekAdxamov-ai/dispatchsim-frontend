// Thin layer over api/client.js for /tracking. Authenticated, any granted
// role — same gating as /loads. The response shape is defined by
// tracking.service.js on the backend: { loads: [...], meta: {...} }.
import { api } from './client'

export function getTrackingBoard(signal) {
  return api.get('/tracking', { auth: true, signal })
}

// The map's standing reference data: the closed set of cities the seed can
// route through. Static until a deploy changes cities.js, so it is fetched
// once per mount and never polled -- unlike the board, which moves.
export function getTrackingMapReference(signal) {
  return api.get('/tracking/map', { auth: true, signal })
}

// The fleet map's A→B lane search. `origin`/`destination` are free-text
// city queries ("Dallas, TX" / "Dallas"); either may be omitted. Returns
// { lane, results, hotLanes } -- see the map page's search panel.
export function searchLane({ origin, destination, signal }) {
  const params = new URLSearchParams()
  if (origin) params.set('origin', origin)
  if (destination) params.set('destination', destination)
  return api.get(`/tracking/lane?${params.toString()}`, { auth: true, signal })
}

// Type-ahead for the search boxes: prefix completions over the same
// closed city set the backend resolves against, so a completed value
// always resolves.
export function getCityCompletions(q, signal) {
  return api.get(`/tracking/cities?q=${encodeURIComponent(q)}`, { auth: true, signal })
}

// The map's route panel: real road geometry for one fully-resolved lane
// (both ends already { city, state } -- e.g. a searchLane() result's
// `lane`, never free text). Backed by OSRM through routing.service.js's
// cache, so a lane already searched once never re-hits OSRM. Up to three
// { alternativeIndex, geometry, distanceMi, durationMin, roadRefs },
// OSRM's own order -- ranking by duration (for "Fastest") is the page's
// job, not this call's. A cold lane that OSRM cannot answer for throws
// ApiError('ROUTE_UNAVAILABLE', ...); the page falls back to the
// straight-line lane it already draws rather than hiding the search.
export function getLaneRoutes({ originCity, originState, destinationCity, destinationState, signal }) {
  const params = new URLSearchParams({ originCity, originState, destinationCity, destinationState })
  return api.get(`/tracking/route?${params.toString()}`, { auth: true, signal })
}

// The board's per-load detail: the FULL road geometry for one load, not
// the simplified copy the poll already carries in `routeGeometry`
// (tracking.service.js's BOARD_TOLERANCE_MI -- coarse enough for the
// whole-country view, visibly cut-corner at street zoom on the selected
// load). Fetched once when a load is actually selected, not on the 10s
// poll -- see Tracking.jsx's selectedFullGeometry cache, keyed by load
// id so re-selecting an already-fetched load never re-fetches it.
// Returns `{ geometry, detail: 'full' }`; throws ApiError('LOAD_NOT_FOUND'
// | 'UNKNOWN_CITY' | 'ROUTE_UNAVAILABLE', ...) same as getLaneRoutes --
// the caller falls back to the simplified board line rather than hiding
// the selection.
export function getLoadRoute(loadId, signal) {
  return api.get(`/tracking/loads/${encodeURIComponent(loadId)}/route`, { auth: true, signal })
}
