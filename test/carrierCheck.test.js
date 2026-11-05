// The broker's refusal to book without a verified MC, as the screen shows it.
// No DOM, no network.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { carrierCheckMessage } from '../src/utils/carrierCheck.js'

const SENTENCE = 'Devin: "That MC doesn\'t come up on my end -- I can\'t send paper until I have the right one."'

// Kills: the broker's own sentence replaced by the generic line
test('shows the sentence the server wrote', () => {
  const err = { code: 'CARRIER_NOT_VERIFIED', message: 'generic', details: { reason: 'mc-mismatch', message: SENTENCE } }
  assert.equal(carrierCheckMessage(err), SENTENCE)
})

// Kills: a silent failure when details are stripped
test('falls back to the error message, then to a fixed line', () => {
  assert.equal(carrierCheckMessage({ code: 'CARRIER_NOT_VERIFIED', message: 'The broker will not send a rate confirmation until your MC checks out' }),
    'The broker will not send a rate confirmation until your MC checks out')
  assert.match(carrierCheckMessage({ code: 'CARRIER_NOT_VERIFIED' }), /MC checks out/)
})

// Kills: another error's text being shown as the MC refusal
test('other codes are not handled here', () => {
  assert.equal(carrierCheckMessage({ code: 'CHAT_DAILY_LIMIT', message: 'x' }), null)
  assert.equal(carrierCheckMessage(null), null)
})

// Kills: the page not routing the code to this message
test('BrokerChat maps CARRIER_NOT_VERIFIED to carrierCheckMessage', () => {
  const src = readFileSync(new URL('../src/pages/BrokerChat.jsx', import.meta.url), 'utf8')
  assert.match(src, /case 'CARRIER_NOT_VERIFIED':\s+return carrierCheckMessage\(err\)/)
})
