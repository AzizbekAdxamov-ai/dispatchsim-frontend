// The broker thread, read back after the rate is agreed -- tested without
// React. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { talkSummary } from '../src/components/brokerChat/talkSummary.js'

const TALK = {
  used: ['all-in', 'detention'],
  confirm: [
    { key: 'appointment', label: 'Appointment times', raised: false },
    { key: 'fuel', label: 'Fuel in the rate', raised: true },
    { key: 'detention', label: 'Detention', raised: true },
  ],
}

// Kills: showing the list while the rate is still being worked -- the
// program would be asking the questions for them.
test('nothing is shown before the rate is agreed', () => {
  assert.equal(talkSummary(TALK, 'open'), null)
  assert.equal(talkSummary(TALK, undefined), null)
  assert.equal(talkSummary(null, 'agreed'), null)
})

// Kills: swapping raised and not raised, or dropping the words used.
test('after agreeing: what was raised, what was not, and the words used', () => {
  for (const status of ['agreed', 'booked']) {
    const s = talkSummary(TALK, status)
    assert.equal(s.raised, 'Raised before agreeing: Fuel in the rate, Detention.')
    assert.equal(s.notRaised, 'Not raised: Appointment times.')
    assert.equal(s.words, 'Trade words you used: all-in, detention.')
  }
})

// Kills: an empty line printed as "Raised before agreeing: ." when
// nothing was raised, or a "Not raised:" line when everything was.
test('empty sides read as sentences, not as blanks', () => {
  const none = talkSummary({ used: [], confirm: TALK.confirm.map((c) => ({ ...c, raised: false })) }, 'agreed')
  assert.equal(none.raised, 'Raised before agreeing: none of these.')
  assert.equal(none.words, 'Trade words you used: none.')
  const all = talkSummary({ used: ['x'], confirm: TALK.confirm.map((c) => ({ ...c, raised: true })) }, 'agreed')
  assert.equal(all.notRaised, null)
})
