// Thin layer over api/client.js for /alerts.
// Readable by every role — see alerts.routes.js on why.
import { api } from './client'

// Everything that is true right now and has not been acknowledged.
//
// The response also carries meta.degraded — the names of any checks that
// failed. A short list because a query broke must not read as good news.
export function listAlerts(signal) {
  return api.get('/alerts', { auth: true, signal })
}

// "I have seen this." The fingerprint is the one the alert was shown with:
// when the situation changes, the fingerprint changes and the alert comes
// back on its own.
export function ackAlert({ alertKey, fingerprint }, signal) {
  return api.post('/alerts/ack', { alertKey, fingerprint }, { auth: true, signal })
}

export function unackAlert({ alertKey }, signal) {
  return api.post('/alerts/unack', { alertKey }, { auth: true, signal })
}
