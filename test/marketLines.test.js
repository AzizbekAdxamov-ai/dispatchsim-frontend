// The market under a posting, in words -- tested without React.
// Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { marketLines } from '../src/components/loadboard/marketLines.js'

const MARKET = {
  equipmentType: 'dry-van',
  weekEnding: '2026-09-25',
  source: 'DAT Freight & Analytics',
  national: 2.17,
  origin: { region: 'Great Lakes', linehaul: 2.66, source: 'regional' },
  destination: { region: 'Upper Mountain', linehaul: 2.17, source: 'national' },
}

// Kills: rendering a market block for a posting that has none (tanker,
// step-deck, power-only), which would print "$NaN".
test('no market, no block', () => {
  assert.equal(marketLines(null), null)
  assert.equal(marketLines(undefined), null)
})

// Kills: swapping origin and destination, or dropping the national line
// both are measured against.
test('origin, then the reload out of the destination, then national', () => {
  const m = marketLines(MARKET)
  assert.deepEqual(m.lines.map((l) => [l.label, l.value]), [
    ['Freight out of Great Lakes', '$2.66/mi'],
    ['Reload out of Upper Mountain', '$2.17/mi'],
    ['National', '$2.17/mi'],
  ])
})

// Kills: a national fallback shown as if it were a regional figure.
test('a region with no figure this week says it is the national one', () => {
  const [origin, dest] = marketLines(MARKET).lines
  assert.equal(origin.note, null)
  assert.match(dest.note, /no regional figure this week/)
})

// Kills: the date losing its anchors (noon, UTC) and shifting a day west
// of Greenwich (Sep 24 in the Americas), or the
// footnote losing "fuel excluded" -- the board's own rates include fuel,
// and comparing the two without knowing is the mistake this line stops.
test('the week is the one DAT measured, and the footnote says what the number leaves out', () => {
  // A dispatcher in the Americas, where midnight UTC is still yesterday.
  const tz = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'
  const m = marketLines(MARKET, new Date('2026-10-05T15:00:00Z'))
  process.env.TZ = tz
  assert.equal(m.heading, 'Market · week ending Sep 25')
  assert.match(m.footnote, /fuel excluded/)
  assert.match(m.footnote, /not a quote for this lane/)
  assert.match(m.footnote, /Board rates include fuel/)
})

// Kills: never saying a figure is old, or saying it about this week's.
// Two weeks is the line; DAT publishes weekly.
test('a benchmark older than two weeks says how old', () => {
  assert.equal(marketLines(MARKET, new Date('2026-10-05T15:00:00Z')).heading, 'Market · week ending Sep 25')
  assert.equal(marketLines(MARKET, new Date('2026-10-20T15:00:00Z')).heading, 'Market · week ending Sep 25 · 24 days old')
})
