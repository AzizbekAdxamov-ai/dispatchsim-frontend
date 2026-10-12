// Trip plan facts stored before 2026-10-08, read as a person reads them.
// The inputs are the lines on load 600010's page that day. Each test names
// the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { factText } from '../src/components/loads/factText.js'

// Kills: a UTC ISO time left in the text, or converted in the wrong zone.
test('ISO times become company-clock times', () => {
  assert.equal(
    factText('After detention at the dock (bill detention), the HOS-legal arrival is 2026-10-06T13:04:48.916Z.'),
    'After detention at the dock (bill detention), the HOS-legal arrival is Oct 6, 08:04 CT.',
  )
})

// Kills: the server command shown to a student, or the sentence around it damaged.
test('a server command is taken out; the rest of the sentence stays', () => {
  assert.equal(
    factText('No road route is cached for Nashville, TN → New York, NY (npm run routes:warm fills it). No fuel or rest stops were planned.'),
    'No road route is cached for Nashville, TN → New York, NY. No fuel or rest stops were planned.',
  )
  assert.equal(factText('Open detention: the driver is on duty at the scene (mile 0) until a choice is applied.'),
    'Open detention: the driver is on duty at the scene (mile 0) until a choice is applied.')
})
