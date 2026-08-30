// Thin layer over api/client.js for /load-board. Every call is authenticated.
// Backend contract:
//   GET  /load-board          → { postings: [...], meta: { total, page, limit } }
//   GET  /load-board/:id      → { posting: { ... } }
//   POST /load-board/:id/book → { load, posting, warnings: [...] }  (201 new, 200 idempotent)
import { api } from './client'

export function listPostings({ equipmentType, originState, minRatePerMile, maxDeadheadMi, sort, page, limit } = {}, signal) {
  const params = new URLSearchParams()
  if (equipmentType) params.set('equipmentType', equipmentType)
  if (originState) params.set('originState', originState)
  if (minRatePerMile != null) params.set('minRatePerMile', String(minRatePerMile))
  if (maxDeadheadMi != null) params.set('maxDeadheadMi', String(maxDeadheadMi))
  if (sort) params.set('sort', sort)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return api.get(`/load-board${qs ? `?${qs}` : ''}`, { auth: true, signal })
}

export function getPosting(id, signal) {
  return api.get(`/load-board/${encodeURIComponent(id)}`, { auth: true, signal })
}

export function bookPosting(id, { driverId } = {}, signal) {
  return api.post(`/load-board/${encodeURIComponent(id)}/book`, { driverId }, { auth: true, signal })
}
