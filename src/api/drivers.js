// Thin layer over api/client.js for /drivers. Not paginated on the
// backend (~30 rows) — no query params are sent.
import { api } from './client'

export function listDrivers(signal) {
  return api.get('/drivers', { auth: true, signal })
}

export function getDriver(id, signal) {
  return api.get(`/drivers/${encodeURIComponent(id)}`, { auth: true, signal })
}

// The trucks nobody drives, for "Assign truck" on a driver's page. Every
// driverless truck comes back, with `assignable` and a `reason` for the
// ones that cannot be taken -- the page shows those rather than hiding
// them.
export function getTruckOptions(id, signal) {
  return api.get(`/drivers/${encodeURIComponent(id)}/truck-options`, { auth: true, signal })
}

// The same assignment fleet does from the truck's page, asked from the
// driver's side. Server-side it is one function, not two.
export function assignTruck(id, truckId, signal) {
  return api.post(`/drivers/${encodeURIComponent(id)}/truck`, { truckId }, { auth: true, signal })
}

// Takes the driver off the truck; the server refuses while a load is moving
// on it, and writes the lease owed up to now.
export function unassignTruck(id, signal) {
  return api.del(`/drivers/${encodeURIComponent(id)}/truck`, { auth: true, signal })
}
