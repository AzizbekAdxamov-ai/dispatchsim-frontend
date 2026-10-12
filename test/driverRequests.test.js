// A driver's standing requests on the profile page -- tested without
// React. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { driverRequests } from '../src/components/drivers/driverRequests.js'

// Kills: an "Asked not to run" panel for a driver who asked for nothing
// (the column defaults to {}), or a crash on null.
test('no requests, no panel', () => {
  for (const p of [{}, null, undefined, [], { avoidCities: [], avoidStates: [] }]) {
    assert.equal(driverRequests(p), null, JSON.stringify(p))
  }
})

// Kills: dropping the states, the reason, or the state code's case.
test('cities, then states, with the reason as written', () => {
  assert.deepEqual(
    driverRequests({ avoidCities: [{ city: 'New York', state: 'ny' }], avoidStates: ['nj'], why: ' No room to turn. ' }),
    { places: 'New York, NY, NJ', why: 'No room to turn.' },
  )
})

// Kills: printing "undefined, undefined" for a malformed entry.
test('entries it does not understand are left out', () => {
  assert.deepEqual(
    driverRequests({ avoidCities: [{ city: 'New York' }, 'Boston', { city: 'Newark', state: 'NJ' }], avoidStates: [5, ' '] }),
    { places: 'Newark, NJ', why: null },
  )
})
