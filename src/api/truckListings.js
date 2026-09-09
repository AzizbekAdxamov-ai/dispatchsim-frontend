import { api } from './client'

export function listTruckListings(signal) {
  return api.get('/fleet/truck-listings', { auth: true, signal })
}

export function getTruckListing(id, signal) {
  return api.get(`/fleet/truck-listings/${id}`, { auth: true, signal })
}

export function buyTruckListing(id, signal) {
  return api.post(`/fleet/truck-listings/${id}/buy`, {}, { auth: true, signal })
}

// Put a driver in a truck. The endpoint has existed since the truck
// market was built, but nothing on the front end called it -- so a bought
// truck stayed empty, and every dispatch failed with "that driver has no
// truck" and no way to fix it.
export function assignDriverToTruck(truckId, driverId, signal) {
  return api.post(
    `/fleet/trucks/${encodeURIComponent(truckId)}/assign`,
    { driverId },
    { auth: true, signal },
  )
}
