import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preSignWarnings, PRE_SIGN_COPY } from '../src/components/brokerChat/preSignWarnings.js'

// Kills: warning only after booking -- the live thread showed it once the load was already created
test('an agreed thread with no matching truck warns before signing', () => {
  const lines = preSignWarnings({ preSignWarnings: ['no-matching-equipment'] }, 'agreed')
  assert.deepEqual(lines, [PRE_SIGN_COPY['no-matching-equipment']])
})

// Kills: showing the warning on an open or booked thread (booked has its own post-accept list)
test('only an agreed thread shows pre-sign warnings', () => {
  for (const status of ['open', 'booked', undefined]) {
    assert.deepEqual(preSignWarnings({ preSignWarnings: ['no-matching-equipment'] }, status), [])
  }
  assert.deepEqual(preSignWarnings({}, 'agreed'), [])
  assert.deepEqual(preSignWarnings(null, 'agreed'), [])
})
