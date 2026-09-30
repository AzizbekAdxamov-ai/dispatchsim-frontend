// Whether the top bar shows the balance.
//
// The decision lives in a plain module rather than inside the component so
// it can be tested without a DOM. Each test names the mutation it kills.
//
// Context: with the money model off on the server (FINANCE=off) nothing
// accrues against the balance and nothing is refused because of it, so the
// number leaves the bar. The failure this guards against is the mirror
// image -- the balance vanishing when the server did not say it should.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { financeOff } from '../src/utils/financeSwitch.js'

// Kills: the guard doing nothing at all.
test('an explicit false hides the balance', () => {
  assert.equal(financeOff({ financeEnabled: false, balance: -208266 }), true)
})

// Kills: inverting the test.
test('an explicit true keeps it', () => {
  assert.equal(financeOff({ financeEnabled: true, balance: 140000 }), false)
})

// Kills: `!overview?.financeEnabled`, which hides the balance on any
// payload that does not carry the field -- an older server, or a response
// shaped by something else. The chip exists to keep the number in front of
// whoever is spending it; it must not disappear on a silence.
test('a payload without the field keeps the balance visible', () => {
  assert.equal(financeOff({ balance: 140000 }), false)
  assert.equal(financeOff({ financeEnabled: undefined }), false)
  assert.equal(financeOff({ financeEnabled: null }), false)
})

// Kills: `overview.financeEnabled === false`, which throws on the first
// render and on every failed poll -- useResource leaves `data` null.
test('no payload at all is not an answer either', () => {
  assert.equal(financeOff(null), false)
  assert.equal(financeOff(undefined), false)
})
