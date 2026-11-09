// The parts of "Assign truck" that are words, not React -- here so
// node:test can import them (it cannot import JSX).

// One truck, one line: plate first, because the plate is what a
// dispatcher says out loud, then what it pulls, what it is, where it sits.
// `labelFor` turns an equipment KEY into its label (data/equipmentTypes.js,
// which node:test cannot import, so the page hands it in).
export function truckOptionLabel(t, labelFor = (key) => key) {
  const what = [t.year, t.make, t.model].filter((part) => part != null && part !== '').join(' ')
  const trailer = t.equipmentType
    ? [labelFor(t.equipmentType), t.trailerLengthFt ? `${t.trailerLengthFt}'` : null].filter(Boolean).join(' ')
    : null
  const where = t.locationCity && t.locationState ? `${t.locationCity}, ${t.locationState}` : null
  return [t.id, trailer, what || null, where].filter(Boolean).join(' · ')
}

// The lease sentence for the chosen truck, or null when it is not leased.
export function leaseNoteFor(truck, copy) {
  return truck && Number.isFinite(truck.leaseWeeklyUsd) ? copy.leaseNote(truck.leaseWeeklyUsd) : null
}

// Error codes the server sends for this action, said in the page's words.
// Every code here is one the server can actually send
// (backend/src/lib/errors.js; test/errorCodes.test.js keeps that
// catalog honest). The last line -- the server's own message -- is what
// an unexpected code falls back to, so nothing is swallowed into a
// generic "something went wrong" when the server said more.
const MESSAGES = Object.freeze({
  TRUCK_NOT_FOUND: 'That truck is no longer in the fleet.',
  TRUCK_NOT_IDLE: 'That truck is working or in the shop, so it cannot be assigned.',
  TRUCK_HAS_DRIVER: 'Someone was just put in that truck. Pick another.',
  DRIVER_HAS_TRUCK: 'This driver already has a truck.',
  DRIVER_NOT_FOUND: 'This driver is no longer on the roster.',
  DRIVER_HAS_NO_TRUCK: 'This driver has no truck to unassign.',
  TRUCK_HAS_ACTIVE_LOAD: 'This truck is on a load. Unassign it once the load is delivered.',
  FORBIDDEN: 'Assigning trucks is dispatcher or fleet work — switch workspace first.',
  NETWORK_ERROR: 'Cannot reach the server.',
})

export function assignErrorText(code, serverMessage) {
  return MESSAGES[code] ?? serverMessage ?? 'The truck was not assigned.'
}

export function unassignErrorText(code, serverMessage) {
  return MESSAGES[code] ?? serverMessage ?? 'The truck was not unassigned.'
}
