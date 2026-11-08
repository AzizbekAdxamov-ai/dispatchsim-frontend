import { test } from 'node:test'
import assert from 'node:assert/strict'
import { radiusNote, NO_REFERENCE_MESSAGE } from '../src/components/loadboard/boardCount.js'

// Kills: the no-reference-point message missing, or "outside the radius"
// shown when there is nobody to measure deadhead from.
test('no reference point shows the instruction, never the radius text', () => {
  const n = radiusNote({ deadheadFrom: { kind: 'none' }, nearby: 127 })
  assert.equal(n.noReference, true)
  assert.equal(n.emptyNote, NO_REFERENCE_MESSAGE)
  assert.equal(n.nearbyLabel, '')
})

// Kills: dropping the radius note when a reference point does exist.
test('with a reference point the radius count is still stated', () => {
  const n = radiusNote({ deadheadFrom: { kind: 'driver' }, nearby: 3 })
  assert.equal(n.noReference, false)
  assert.equal(n.nearbyLabel, '+3 outside the radius')
  assert.match(n.emptyNote, /^3 postings match everything except the radius/)
  assert.equal(radiusNote({ nearby: 0 }).nearbyLabel, '')
})
