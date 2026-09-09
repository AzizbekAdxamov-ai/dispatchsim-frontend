// Thin layer over api/client.js for /loads. Every call is authenticated —
// GET /loads and GET /loads/:id both require requireAuth + requireRole()
// (any granted role) on the backend.
import { api } from './client'

export function listLoads({ status, equipmentType, search, page, limit } = {}, signal) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (equipmentType) params.set('equipmentType', equipmentType)
  if (search) params.set('search', search)
  if (page) params.set('page', page)
  if (limit) params.set('limit', limit)
  const qs = params.toString()
  return api.get(`/loads${qs ? `?${qs}` : ''}`, { auth: true, signal })
}

// Put a driver on a booked load and start the clock. The truck is not
// sent — the server uses whichever truck that driver is assigned to, so
// the client cannot pair a driver with someone else's truck.
export function dispatchLoad(id, driverId, signal) {
  return api.post(`/loads/${encodeURIComponent(id)}/dispatch`, { driverId }, { auth: true, signal })
}

// Take the load back off the driver. Only before delivery — a delivered
// load has an invoice against it and cash has already moved.
export function cancelDispatch(id, signal) {
  return api.post(`/loads/${encodeURIComponent(id)}/cancel`, {}, { auth: true, signal })
}

export function getLoad(id, signal) {
  return api.get(`/loads/${encodeURIComponent(id)}`, { auth: true, signal })
}
