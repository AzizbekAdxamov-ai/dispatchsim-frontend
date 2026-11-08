// Which take-back actions a load offers. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { takeBackOptions } from '../src/components/loads/takeBackOptions.js'

const DRIVER = { id: 'd1' }

// Kills: unassign offered for a booked load nobody is on (nothing to unassign)
test('booked and unassigned with a broker thread: only cancel booking', () => {
  const o = takeBackOptions({ status: 'neutral', driver: null, brokerThreadAvailable: true })
  assert.deepEqual(o, { unassign: false, cancelBooking: true })
})

// Kills: the two actions collapsed back into one
test('on the road with a broker thread: both actions', () => {
  for (const status of ['ontime', 'warn', 'crit']) {
    assert.deepEqual(takeBackOptions({ status, driver: DRIVER, brokerConversationId: 'c1' }), { unassign: true, cancelBooking: true })
  }
})

// Kills: offering either action on a delivered load
test('delivered: nothing', () => {
  assert.deepEqual(takeBackOptions({ status: 'done', driver: DRIVER, brokerThreadAvailable: true }), { unassign: false, cancelBooking: false })
})

// Kills: offering cancel again on a load that is already cancelled
test('cancelled: nothing', () => {
  assert.deepEqual(takeBackOptions({ status: 'cancelled', driver: null, brokerThreadAvailable: true }), { unassign: false, cancelBooking: false })
})

// Kills: cancel booking offered when the user has no broker thread for the load
test('no broker thread: no cancel booking', () => {
  assert.equal(takeBackOptions({ status: 'neutral', driver: null, brokerThreadAvailable: false, brokerConversationId: null }).cancelBooking, false)
})
