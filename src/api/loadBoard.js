// Thin layer over api/client.js for /load-board. Every call is authenticated.
// Backend contract:
//   GET  /load-board          → { postings: [...], meta: { total, nearby, page, limit, deadheadFrom, deadheadTo } }
//   GET  /load-board/:id      → { posting: { ... } }
//   POST /load-board/:id/book → { load, posting, warnings: [...] }  (201 new, 200 idempotent)
import { api } from './client'

export function listPostings(filters = {}, signal) {
  const {
    equipmentType, originState, destinationState, originZone, destinationZone,
    minRatePerMile, maxDeadheadMi, maxDeadheadDestMi, maxLengthFt, maxWeightLbs,
    pickupFrom, pickupBefore, sort, page, limit,
    fromCity, fromState, toCity, toState,
  } = filters
  const params = new URLSearchParams()
  // Several equipment types go up as one comma-separated value -- the
  // server parses the list and refuses an unknown key rather than
  // dropping it.
  if (equipmentType) {
    const list = Array.isArray(equipmentType) ? equipmentType : [equipmentType]
    if (list.length > 0) params.set('equipmentType', list.join(','))
  }
  if (originState) params.set('originState', originState)
  if (destinationState) params.set('destinationState', destinationState)
  if (originZone) params.set('originZone', originZone)
  if (destinationZone) params.set('destinationZone', destinationZone)
  if (fromCity) params.set('fromCity', fromCity)
  if (fromState) params.set('fromState', fromState)
  if (toCity) params.set('toCity', toCity)
  if (toState) params.set('toState', toState)
  if (minRatePerMile != null) params.set('minRatePerMile', String(minRatePerMile))
  if (maxDeadheadMi != null) params.set('maxDeadheadMi', String(maxDeadheadMi))
  if (maxDeadheadDestMi != null) params.set('maxDeadheadDestMi', String(maxDeadheadDestMi))
  if (maxLengthFt != null) params.set('maxLengthFt', String(maxLengthFt))
  if (maxWeightLbs != null) params.set('maxWeightLbs', String(maxWeightLbs))
  // Instants, not dates: the picker shows local days, and the edges of
  // those days are what the server is asked for. See the schema.
  if (pickupFrom) params.set('pickupFrom', new Date(pickupFrom).toISOString())
  if (pickupBefore) params.set('pickupBefore', new Date(pickupBefore).toISOString())
  if (sort) params.set('sort', sort)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return api.get(`/load-board${qs ? `?${qs}` : ''}`, { auth: true, signal })
}

// Pass the same fromCity/fromState the list used, so the detail view reports
// the same deadhead as the row the user clicked.
export function getPosting(id, { fromCity, fromState, toCity, toState } = {}, signal) {
  const params = new URLSearchParams()
  if (fromCity) params.set('fromCity', fromCity)
  if (fromState) params.set('fromState', fromState)
  if (toCity) params.set('toCity', toCity)
  if (toState) params.set('toState', toState)
  const qs = params.toString()
  return api.get(`/load-board/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`, { auth: true, signal })
}

// bookPosting is gone (2026-09-02). A load is created by accepting the
// broker's rate confirmation — see acceptRateCon in api/brokerChat.js.

export function listCities(signal) {
  return api.get('/load-board/cities', { auth: true, signal })
}
