// The parts of "Assign truck" that are words, not React -- here so
// node:test can import them (it cannot import JSX).

// One truck, one line: plate first, because the plate is what a
// dispatcher says out loud, then what it is, then where it sits.
export function truckOptionLabel(t) {
  const what = [t.year, t.make, t.model].filter((part) => part != null && part !== '').join(' ')
  const where = t.locationCity && t.locationState ? `${t.locationCity}, ${t.locationState}` : null
  return [t.id, what || null, where].filter(Boolean).join(' · ')
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
  FORBIDDEN: 'Assigning trucks is dispatcher or fleet work — switch workspace first.',
  NETWORK_ERROR: 'Cannot reach the server.',
})

export function assignErrorText(code, serverMessage) {
  return MESSAGES[code] ?? serverMessage ?? 'The truck was not assigned.'
}
