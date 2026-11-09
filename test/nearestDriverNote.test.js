import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestDriverNote, NEAREST_DRIVER_COPY } from '../src/components/loadboard/nearestDriverNote.js'

// Kills: a silent empty slot when no truck pulls the trailer (live: flatbed posting, only dry vans)
test('fleet mode with no matching driver names the missing truck', () => {
  assert.equal(nearestDriverNote({ equipmentType: 'flatbed' }, { kind: 'driver' }, NEAREST_DRIVER_COPY, 'Flatbed'), 'No Flatbed truck in the fleet')
  assert.equal(nearestDriverNote({ equipmentType: 'flatbed' }, null, NEAREST_DRIVER_COPY, 'Flatbed'), 'No Flatbed truck in the fleet')
})

// Kills: showing the note next to a real driver, or when measuring from a typed city
test('a driver, or a typed city, shows no note', () => {
  assert.equal(nearestDriverNote({ nearestDriverName: 'Ethan' }, null, NEAREST_DRIVER_COPY, 'Flatbed'), null)
  assert.equal(nearestDriverNote({ nearestDriver: { name: 'Ethan' } }, null, NEAREST_DRIVER_COPY, 'Flatbed'), null)
  assert.equal(nearestDriverNote({}, { kind: 'location', city: 'Dallas', state: 'TX' }, NEAREST_DRIVER_COPY, 'Flatbed'), null)
})
