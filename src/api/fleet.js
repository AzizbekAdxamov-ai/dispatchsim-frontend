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

// Daily vehicle inspection reports (49 CFR 396.11), newest first. Each
// report carries the checklist as booleans, the defect notes, and the
// certification state the next driver's sign-off answers to (396.13).
export function listDvir(signal) {
  return api.get('/fleet/dvir', { auth: true, signal })
}

// The next driver's 396.13(b)(2) sign-off: the last report's defects are
// certified as fixed, which clears the hold the report put on the truck.
export function certifyDvir(reportId, driverId) {
  return api.post(`/fleet/dvir/${encodeURIComponent(reportId)}/certify`, { driverId }, { auth: true })
}
