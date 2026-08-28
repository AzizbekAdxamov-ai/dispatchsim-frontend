// Thin layer over api/client.js for /drivers. Not paginated on the
// backend (~30 rows) — no query params are sent.
import { api } from './client'

export function listDrivers(signal) {
  return api.get('/drivers', { auth: true, signal })
}

export function getDriver(id, signal) {
  return api.get(`/drivers/${encodeURIComponent(id)}`, { auth: true, signal })
}
