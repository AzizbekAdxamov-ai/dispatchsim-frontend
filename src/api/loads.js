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

export function getLoad(id, signal) {
  return api.get(`/loads/${encodeURIComponent(id)}`, { auth: true, signal })
}
