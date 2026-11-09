import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestDriverNote, NEAREST_DRIVER_COPY } from '../src/components/loadboard/nearestDriverNote.js'

// Kills: a silent empty slot when no truck pulls the trailer (live: flatbed posting, only dry vans)
test('only a fleet with no truck of that trailer type names the missing truck', () => {
  const flatbed = { equipmentType: 'flatbed', fleetHasEquipment: false }
  assert.equal(nearestDriverNote(flatbed, { kind: 'driver' }, NEAREST_DRIVER_COPY, 'Flatbed'), 'No Flatbed truck in the fleet')
  assert.equal(nearestDriverNote(flatbed, null, NEAREST_DRIVER_COPY, 'Flatbed'), 'No Flatbed truck in the fleet')
})

// Kills: calling busy drivers "no truck in the fleet" (the fleet has the trailer, nobody is free)
test('a fleet that has the trailer but no free driver says so neutrally', () => {
  for (const fleetHasEquipment of [true, null, undefined]) {
    assert.equal(nearestDriverNote({ fleetHasEquipment }, null, NEAREST_DRIVER_COPY, 'Flatbed'), NEAREST_DRIVER_COPY.noneFree)
  }
})

// Kills: showing the note next to a real driver, or when measuring from a typed city
test('a driver, or a typed city, shows no note', () => {
  assert.equal(nearestDriverNote({ nearestDriverName: 'Ethan' }, null, NEAREST_DRIVER_COPY, 'Flatbed'), null)
  assert.equal(nearestDriverNote({ nearestDriver: { name: 'Ethan' } }, null, NEAREST_DRIVER_COPY, 'Flatbed'), null)
  assert.equal(nearestDriverNote({}, { kind: 'location', city: 'Dallas', state: 'TX' }, NEAREST_DRIVER_COPY, 'Flatbed'), null)
})
