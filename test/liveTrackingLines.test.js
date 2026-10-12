// The Live tracking panel's lines. 2026-10-08: load 600010 read "100%
// complete" with its truck at the shipper in open detention. Each test
// names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { liveTrackingLines } from '../src/components/loads/liveTrackingLines.js'

const NOW = new Date('2026-10-08T20:06:00Z')
const LOAD = { destinationCity: 'New York', destinationState: 'NY' }
const base = {
  milesDone: 0, milesTotal: 895, fraction: 0, etaAt: '2026-10-09T13:04:00Z', promisedEtaAt: '2026-10-08T16:33:00Z',
  etaPastPromiseMin: 1231, geometrySource: 'route',
}

// Kills: the stopped truck described without its reason or its duration.
test('stopped by an event: reason, since when, for how long', () => {
  const l = liveTrackingLines({ ...base, state: 'event', reason: 'Detention at the dock', since: '2026-10-07T14:06:00Z' }, LOAD, NOW)
  assert.equal(l[0], 'Mile 0 of 895')
  assert.match(l[1], /^Stopped: Detention at the dock since Oct 7, 09:06 \(1d 6h\)\./)
})

// Kills: the promise comparison dropped, or said when on time.
test('the ETA beside the promise, and by how much it is past', () => {
  const late = liveTrackingLines({ ...base, state: 'moving' }, LOAD, NOW)
  assert.match(late[2], /^ETA Oct 9, 08:04 · promised Oct 8, 11:33 — 20h 31m after the promise$/)
  const fine = liveTrackingLines({ ...base, state: 'moving', etaPastPromiseMin: null }, LOAD, NOW)
  assert.doesNotMatch(fine[2], /after the promise/)
})

// Kills: a stop shown without its place or kind; the straight-line
// fallback presented as a road position.
test('a planned stop names the place and kind; an approximate position says so', () => {
  const l = liveTrackingLines({ ...base, state: 'stop', reason: 'fuel', place: { name: "Love's #512", city: 'Knoxville', state: 'TN' }, since: '2026-10-08T19:06:00Z', geometrySource: 'arc' }, LOAD, NOW)
  assert.match(l[1], /^At Love's #512, Knoxville, TN — fuel stop since/)
  assert.match(l[3], /approximate/)
  assert.deepEqual(liveTrackingLines(null, LOAD, NOW), [])
})
