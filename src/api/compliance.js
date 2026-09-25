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

// Compliance > Unassigned HOS: the ELD's unidentified driving records
// (49 CFR 395.32), grouped by vehicle and simulated day by the backend.
export function getUnassignedHos(signal) {
  return api.get('/compliance/unassigned-hos', { auth: true, signal })
}

// Compliance > Driver Qualification: every working driver's DQ file
// (49 CFR 391 Subpart E), already timed by the backend -- statuses are
// the row's reading AS OF now, not a stored verdict.
export function getDriverQualification(signal) {
  return api.get('/compliance/driver-qualification', { auth: true, signal })
}

// The review of one record. Assign names the driver who actually drove
// (395.32(d): the original is kept, marked changed, and a replacement
// goes into the driver's log); annotate explains the drive instead --
// the record stays exactly where the ELD wrote it.
export function assignUnassignedHos(eventId, { driverId, annotation }) {
  return api.post(`/compliance/unassigned-hos/${encodeURIComponent(eventId)}/assign`, { driverId, annotation }, { auth: true })
}

export function annotateUnassignedHos(eventId, { annotation }) {
  return api.post(`/compliance/unassigned-hos/${encodeURIComponent(eventId)}/annotate`, { annotation }, { auth: true })
}
