// The shell changes shape at 1100 and 768 (breakpoints.js): wide keeps the
// sidebar the user chose, 768-1099 forces the 60px rail, below 768 there is
// no sidebar in the page, only a drawer behind a hamburger.
//
// Kills: moving a breakpoint in the JS without the CSS (or the reverse),
// an off-by-one at 1099/1100 or 767/768.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { BP, DRAWER_QUERY, WIDE_QUERY, viewportMode } from '../src/components/layout/breakpoints.js'

test('wide from 1100 up', () => {
  for (const w of [1920, 1440, 1280, 1100]) assert.equal(viewportMode(w), 'wide', String(w))
})

test('rail from 768 to 1099', () => {
  for (const w of [1099, 1024, 768]) assert.equal(viewportMode(w), 'rail', String(w))
})

test('drawer below 768', () => {
  for (const w of [767, 390, 360]) assert.equal(viewportMode(w), 'drawer', String(w))
})

test('the media queries use the same numbers', () => {
  assert.equal(BP.wide, 1100)
  assert.equal(BP.drawer, 768)
  assert.match(WIDE_QUERY, /min-width: 1100px/)
  assert.match(DRAWER_QUERY, /max-width: 767\.98px/)
})
