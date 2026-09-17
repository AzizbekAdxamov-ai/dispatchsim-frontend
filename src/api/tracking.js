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
