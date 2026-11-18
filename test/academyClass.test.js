// Class screen helpers: font size bounds, the countdown text, step names.
//
// Kills: a stored size outside the readable range; a negative clock shown
// as garbage; the first/last steps labelled with numbers.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampFs, formatClock, stepLabel, readFs, writeFs, FS_MIN, FS_MAX, FS_DEFAULT } from '../src/data/academyClass.js'

test('clampFs keeps the size in range and falls back on junk', () => {
  assert.equal(clampFs(4), FS_MIN)
  assert.equal(clampFs(99), FS_MAX)
  assert.equal(clampFs('24'), 24)
  assert.equal(clampFs('abc'), FS_DEFAULT)
})

test('readFs/writeFs round-trip', () => {
  const m = new Map()
  const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }
  assert.equal(readFs(st), FS_DEFAULT)
  writeFs(28, st)
  assert.equal(readFs(st), 28)
})

test('formatClock', () => {
  assert.equal(formatClock(0), '00:00')
  assert.equal(formatClock(65), '01:05')
  assert.equal(formatClock(-5), '+00:05')
})

test('stepLabel', () => {
  assert.equal(stepLabel(0, 9), 'Kirish')
  assert.equal(stepLabel(3, 9), '3')
  assert.equal(stepLabel(8, 9), 'Yakun')
})
