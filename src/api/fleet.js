// Thin layer over api/client.js for /fleet/*. Every route requires the
// fleet-manager role on the backend.
import { api } from './client'

export function listTrucks(signal) {
  return api.get('/fleet/trucks', { auth: true, signal })
}

export function getTruck(id, signal) {
  return api.get(`/fleet/trucks/${encodeURIComponent(id)}`, { auth: true, signal })
}

export function listMaintenance(signal) {
  return api.get('/fleet/maintenance', { auth: true, signal })
}
