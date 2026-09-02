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
