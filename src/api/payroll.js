// Thin layer over api/client.js for /payroll.
//
// Driver pay used to be computed in two places that disagreed — the ledger
// paid one figure at delivery, this page displayed another from a formula
// of its own. There is one source now: driver_settlements.
import { api } from './client'

// Every settlement, with what is owed and what a run would move right now.
export function listSettlements(signal) {
  return api.get('/payroll/settlements', { auth: true, signal })
}

// Per driver: how much, how overdue, and what that means for whether they
// will take the next load.
export function listOwed(signal) {
  return api.get('/payroll/owed', { auth: true, signal })
}

// Pay everything that is due. Safe to call twice — the settlements
// themselves are idempotent, so a second run moves nothing.
export function runPayroll(signal) {
  return api.post('/payroll/run', {}, { auth: true, signal })
}
