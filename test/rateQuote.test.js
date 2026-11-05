import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateQuote } from '../src/utils/rateQuote.js'

test('legacy and all-in quotes keep the canonical total without invented components', () => {
  for (const value of [
    { rateUsd: 3058 },
    { rateUsd: 3058, rateBasis: 'all-in', fuelSurchargeUsd: 400 },
    { rateUsd: 3058, rateBasis: 'unknown', fuelSurchargeUsd: 400 },
  ]) {
    assert.deepEqual(rateQuote(value), { totalUsd: 3058, split: false, linehaulUsd: null, fuelSurchargeUsd: null })
  }
})

test('split quote derives linehaul from the canonical total, ignoring stale supplied linehaul', () => {
  assert.deepEqual(rateQuote({ rateUsd: 3058, rateBasis: 'linehaul-plus-fuel', fuelSurchargeUsd: 458, linehaulUsd: 9999 }), {
    totalUsd: 3058, split: true, linehaulUsd: 2600, fuelSurchargeUsd: 458,
  })
})

test('hidden quote cannot leak either component even when raw API fields are present', () => {
  assert.deepEqual(rateQuote({ rateHidden: true, rateUsd: 3058, rateBasis: 'linehaul-plus-fuel', fuelSurchargeUsd: 458 }), {
    totalUsd: null, split: false, linehaulUsd: null, fuelSurchargeUsd: null,
  })
})

test('invalid fuel cannot create a misleading split or alter total', () => {
  for (const fuelSurchargeUsd of [null, undefined, -1, 0, 3058, 9000, '458', 4.5, Infinity, NaN]) {
    const quote = rateQuote({ rateUsd: 3058, rateBasis: 'linehaul-plus-fuel', fuelSurchargeUsd })
    assert.equal(quote.totalUsd, 3058)
    assert.equal(quote.split, false)
    assert.equal(quote.linehaulUsd, null)
  }
  for (const rateUsd of [null, undefined, '3058', -1, Infinity, NaN]) {
    assert.equal(rateQuote({ rateUsd, rateBasis: 'linehaul-plus-fuel', fuelSurchargeUsd: 458 }).totalUsd, null)
  }
})
