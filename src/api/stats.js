// Thin layer over api/client.js for /stats. Open to any granted role — the
// main dashboard is every role's home page.
import { api } from './client'

export function getDashboard(signal) {
  return api.get('/stats/dashboard', { auth: true, signal })
}

// Compliance > Overview: the operation's cleanliness composed from each
// compliance module's own readings. A failed source arrives as a name in
// `degraded` -- a missing tile says "not measured", never "all clear".
export function getComplianceOverview(signal) {
  return api.get('/stats/compliance', { auth: true, signal })
}
