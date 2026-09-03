// Thin layer over api/client.js for /broker-check.
// Backend is dispatcher-only (requireRole('dispatcher')).
import { api } from './client'

// Run an MC number past the credit service. Always resolves — a number
// with no carrier record behind it comes back as { found: false }, which
// is an answer worth having, not an error.
export function checkMc(mcNumber, signal) {
  return api.post('/broker-check', { mcNumber }, { auth: true, signal })
}

// Everything this dispatcher has looked up, newest first.
export function listChecks(signal) {
  return api.get('/broker-check', { auth: true, signal })
}
