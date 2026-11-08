import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateConLine, RATE_CON_LINE_COPY } from '../src/components/brokerChat/rateConLine.js'

const row = (extra = {}) => ({ kind: 'rate_con', rateConRateUsd: 3325, rateConBasis: 'all-in', rateConFuelSurchargeUsd: null, voidedAt: null, ...extra })

// Kills: dropping the all-in label, or formatting without thousands separators
test('an all-in paper shows the total', () => {
  assert.equal(rateConLine(row()), '$3,325 all-in')
})

// Kills: showing only the total on a split paper (linehaul and fuel lost)
test('a split paper shows total, linehaul and fuel', () => {
  assert.equal(
    rateConLine(row({ rateConBasis: 'linehaul-plus-fuel', rateConFuelSurchargeUsd: 425 })),
    '$3,325 total · linehaul $2,900 + fuel $425',
  )
})

// Kills: printing "$0" or a guess when the row carries no figure (voided or undelivered)
test('no figure, no line', () => {
  assert.equal(rateConLine(row({ rateConRateUsd: null })), null)
  assert.equal(rateConLine(row({ voidedAt: '2026-11-08T10:00:00Z' })), null)
  assert.equal(rateConLine(null), null)
})

// Kills: wording baked into the function instead of read from the copy argument
test('the words come from the copy argument', () => {
  assert.equal(rateConLine(row(), { ...RATE_CON_LINE_COPY, allIn: 'flat' }), '$3,325 flat')
})
