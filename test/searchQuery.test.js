// The search bar's draft, turned into a query.
//
// Three things are worth testing away from the DOM, and all three have
// already been wrong in some board somewhere: what a typed place means,
// which parameters a place turns into, and where a picked day begins.
// That last one is the quiet one -- a date range built in the wrong time
// zone hides a working day of loads and looks exactly like a slow market.
//
// Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  placeLabel, originParams, destinationParams, matchPlaces, dayStart, dayAfter, toFilters,
} from '../src/components/loadboard/searchQuery.js'

const CITIES = [
  { city: 'Dallas', state: 'TX' },
  { city: 'Palmdale', state: 'CA' },
  { city: 'Nazareth', state: 'PA' },
]

// Kills: sending a city as a plain origin state, or a zone as a city --
// each of which is a different search that still returns rows, which is
// the worst kind of wrong.
test('a place becomes the parameters for the side of the trip it is on', () => {
  const city = { kind: 'city', city: 'Dallas', state: 'TX' }
  const state = { kind: 'state', state: 'GA' }
  const zone = { kind: 'zone', zone: 'midwest' }

  assert.deepEqual(originParams(city), { fromCity: 'Dallas', fromState: 'TX' })
  assert.deepEqual(originParams(state), { originState: 'GA' })
  assert.deepEqual(originParams(zone), { originZone: 'midwest' })

  assert.deepEqual(destinationParams(city), { toCity: 'Dallas', toState: 'TX' })
  assert.deepEqual(destinationParams(state), { destinationState: 'GA' })
  assert.deepEqual(destinationParams(zone), { destinationZone: 'midwest' })

  assert.deepEqual(originParams(null), {})
  assert.deepEqual(destinationParams(null), {})
})

// Kills: dropping the two-letter-first ordering. "PA" is Pennsylvania to
// every dispatcher alive; offering Palmdale first is a search run in the
// wrong half of the country.
test('two letters mean the state first', () => {
  const [first] = matchPlaces('PA', CITIES)
  assert.deepEqual(first, { kind: 'state', state: 'PA' })
  assert.ok(matchPlaces('PA', CITIES).some((m) => m.kind === 'city' && m.city === 'Palmdale'))
})

test('a place reads back the way it was typed', () => {
  assert.equal(placeLabel({ kind: 'city', city: 'Dallas', state: 'TX' }), 'Dallas, TX')
  assert.equal(placeLabel({ kind: 'state', state: 'TX' }), 'TX')
  assert.equal(placeLabel(null), '')
})

// Kills: `new Date('2026-09-26')`, which JavaScript reads as UTC midnight
// -- five hours before the board's day starts, so the window opens on the
// evening before and closes five hours early.
test('a picked day begins when it begins on the board, not in UTC', () => {
  // America/Chicago, summer: UTC-5.
  assert.equal(dayStart('2026-09-26').toISOString(), '2026-09-26T05:00:00.000Z')
  // Winter: UTC-6.
  assert.equal(dayStart('2026-12-26').toISOString(), '2026-12-26T06:00:00.000Z')
})

// Kills: adding 24 hours to the start instead of moving to the next
// calendar day. The day the clocks go forward is 23 hours long and the
// day they go back is 25, so a fixed 24 hours lands an hour inside the
// day before or after, twice a year, for one search in a thousand.
test('the exclusive end of a day is the next day, across a clock change', () => {
  // Clocks go forward on 2026-03-08: the 8th begins at 06:00Z, the 9th at 05:00Z.
  assert.equal(dayAfter('2026-03-07').toISOString(), '2026-03-08T06:00:00.000Z')
  assert.equal(dayAfter('2026-03-08').toISOString(), '2026-03-09T05:00:00.000Z')
  // Clocks go back on 2026-11-01: the 1st begins at 05:00Z, the 2nd at 06:00Z.
  assert.equal(dayAfter('2026-10-31').toISOString(), '2026-11-01T05:00:00.000Z')
  assert.equal(dayAfter('2026-11-01').toISOString(), '2026-11-02T06:00:00.000Z')
})

// Kills: sending a radius with a state or a zone. The server measures a
// radius from a point; a state has no point, and the filter would narrow
// against something that was never asked for.
test('a radius is only sent when the place it measures from is a city', () => {
  const base = { equipmentType: [], sort: 'posted' }
  const withCity = toFilters({
    ...base,
    origin: { kind: 'city', city: 'Dallas', state: 'TX' },
    destination: { kind: 'city', city: 'Nazareth', state: 'PA' },
    dhO: 150, dhD: 100,
  })
  assert.equal(withCity.maxDeadheadMi, 150)
  assert.equal(withCity.maxDeadheadDestMi, 100)

  const withState = toFilters({
    ...base,
    origin: { kind: 'state', state: 'TX' },
    destination: { kind: 'zone', zone: 'northeast' },
    dhO: 150, dhD: 100,
  })
  assert.equal(withState.maxDeadheadMi, undefined)
  assert.equal(withState.maxDeadheadDestMi, undefined)
  assert.equal(withState.originState, 'TX')
  assert.equal(withState.destinationZone, 'northeast')
})

// Kills: leaving the window open when only one day is picked. A single
// day chosen in the "from" box has to mean that day, not everything from
// then on -- which is what the board would return with no upper bound.
test('one day picked means that one day', () => {
  const f = toFilters({ equipmentType: [], sort: 'posted', pickupFromDay: '2026-09-26' })
  assert.equal(f.pickupFrom.toISOString(), '2026-09-26T05:00:00.000Z')
  assert.equal(f.pickupBefore.toISOString(), '2026-09-27T05:00:00.000Z')
})

// Kills: sending an empty equipment list as a filter, which the server
// refuses (min(1)) -- so an untouched picker would break every search.
test('an untouched equipment picker is not a filter', () => {
  const f = toFilters({ equipmentType: [], sort: 'rate' })
  assert.equal('equipmentType' in f, false)
  assert.equal(f.sort, 'rate')
  assert.deepEqual(toFilters({ equipmentType: ['reefer'], sort: 'rate' }).equipmentType, ['reefer'])
})
