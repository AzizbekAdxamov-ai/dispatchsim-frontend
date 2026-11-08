// How the company calendar is described to the user. One place, so the
// footnotes on the compliance and dispatch screens cannot disagree with
// each other (or with the server's REAL_MS_PER_SIM_DAY).
//
// Azizbek qarori 2026-11-08: a company day is thirty real minutes
// (it was two). Payments are the exception and wait on shorter days; that
// is deliberately not explained here.
export const COMPANY_DAY_REAL_MINUTES = 30
export const COMPANY_DAY_PHRASE = 'one day every thirty minutes'
