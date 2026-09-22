// Thin layer over api/client.js for /compliance (dispatcher only). Shapes
// are defined by the backend's compliance.service.js. Every *Min field is
// HOS minutes (literal hours of service), not wall-clock minutes.
import { api } from './client'

export function getDriverHos(signal) {
  return api.get('/compliance/hos', { auth: true, signal })
}

// day: 0 = today, -1 = yesterday ... -7 (the current day plus the
// previous 7 -- what a driver must be able to show at roadside).
export function getDriverDayLog(driverId, day = 0, signal) {
  return api.get(`/compliance/hos/${encodeURIComponent(driverId)}/log?day=${day}`, { auth: true, signal })
}

// days: the last N simulated days, today included (1..8).
export function getHosViolations(days = 7, signal) {
  return api.get(`/compliance/violations?days=${days}`, { auth: true, signal })
}
