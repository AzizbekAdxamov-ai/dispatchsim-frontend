// Thin layer over api/client.js for /stats. Open to any granted role — the
// main dashboard is every role's home page.
import { api } from './client'

export function getDashboard(signal) {
  return api.get('/stats/dashboard', { auth: true, signal })
}
