// Thin layer over api/client.js for /cash.
// Readable by every role — see cash.routes.js on why.
import { api } from './client'

// Balance, what it is made of, what is still owed, and how much room is
// left on the credit line.
export function getCashOverview(signal) {
  return api.get('/cash', { auth: true, signal })
}

// The transactions themselves, newest first.
export function listLedger({ limit = 100, kind } = {}, signal) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (kind) params.set('kind', kind)
  return api.get(`/cash/ledger?${params.toString()}`, { auth: true, signal })
}
