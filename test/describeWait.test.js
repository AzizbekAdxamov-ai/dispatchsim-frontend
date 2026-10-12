// The wording of a driver's wait. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describeWait } from '../src/utils/describeWait.js'

// Kills: a boundary moved by one (14/15, 60/61), a missing singular, a
// negative or missing count rendering garbage.
test('exact to two weeks, then weeks, then months', () => {
  assert.equal(describeWait(0), '0 days')
  assert.equal(describeWait(1), '1 day')
  assert.equal(describeWait(14), '14 days')
  assert.equal(describeWait(15), 'a few weeks')
  assert.equal(describeWait(60), 'a few weeks')
  assert.equal(describeWait(61), 'over two months')
  assert.equal(describeWait(4236), 'over two months')
  assert.equal(describeWait(-2), '0 days')
  assert.equal(describeWait(undefined), '0 days')
})

// Kills: a page going back to printing the raw day count.
test('every page that shows a driver wait goes through describeWait', () => {
  const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
  for (const p of ['pages/FinanceSettlements.jsx', 'pages/DriverChat.jsx', 'components/loads/DispatchPanel.jsx']) {
    const src = read(p)
    assert.match(src, /describeWait\(/, p)
    assert.doesNotMatch(src, /\$?\{[a-z]+\.daysOverdue\} days/, p)
  }
})
