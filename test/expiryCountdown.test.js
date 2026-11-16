import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expiryLabel, EXPIRY_COPY } from '../src/components/brokerChat/expiryCountdown.js'

const MS_PER_MINUTE = 60_000
const NOW = Date.parse('2026-11-15T12:00:00Z')
const WARN_MINUTES = 5
const inMinutes = (m) => new Date(NOW + m * MS_PER_MINUTE).toISOString()
const label = (m) => expiryLabel({ expiresAt: inMinutes(m), warnMinutes: WARN_MINUTES, now: NOW })

test('minutes left are shown, rounded up', () => {
  assert.deepEqual(label(6), { text: EXPIRY_COPY.remaining(6), warn: false })
  assert.equal(label(5.2).text, EXPIRY_COPY.remaining(6))
  // Kills: floor instead of ceil (shows 5 min with 5 min 12 s left)
})

test('the line turns to a warning inside the warning window', () => {
  assert.equal(label(WARN_MINUTES).warn, true)
  assert.equal(label(WARN_MINUTES + 1).warn, false)
  // Kills: warn flag never set, or set one minute early
})

test('under a minute and expired have their own wording', () => {
  assert.deepEqual(label(0.5), { text: EXPIRY_COPY.underMinute, warn: true })
  assert.deepEqual(label(0), { text: EXPIRY_COPY.expired, warn: true })
  assert.deepEqual(label(-3), { text: EXPIRY_COPY.expired, warn: true })
  // Kills: "0 min" or a negative number shown
})

test('nothing is shown without an expiry, and the copy is injectable', () => {
  assert.equal(expiryLabel({ expiresAt: null, warnMinutes: WARN_MINUTES, now: NOW }), null)
  assert.equal(expiryLabel({ expiresAt: 'not a date', warnMinutes: WARN_MINUTES, now: NOW }), null)
  const copy = { ...EXPIRY_COPY, remaining: (m) => `${m}!` }
  assert.equal(expiryLabel({ expiresAt: inMinutes(9), warnMinutes: WARN_MINUTES, now: NOW, copy }).text, '9!')
  // Kills: copy hardcoded inside the function
})
