// Dispatch > Routes -- the trip planner. Shape: backend trips.service.js.
import { api } from './client'

// waypoints: ['Dallas, TX', 'Amarillo, TX', 'Denver, CO'] (2..7)
// truck: { maxMph|null, mpg, fuelPricePerGal, costPerMile, costPerHour }
export function planTrip({ waypoints, truck }, signal) {
  return api.post('/trips/plan', { waypoints, truck }, { auth: true, signal })
}
