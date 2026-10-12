// The top bar's three US clocks. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zoneReading, zoneClocks } from '../src/utils/zoneClocks.js'

// Thu Oct 1 2026, 13:53 UTC.
const OCT = new Date('2026-10-01T13:53:00Z')
// Thu Jan 14 2027, 13:53 UTC -- standard time everywhere.
const JAN = new Date('2027-01-14T13:53:00Z')

// Kills: a missing timeZone (the server's or the browser's zone would
// leak in -- Tashkent, on the machine this is built for).
test('each clock reads its own zone, with the day', () => {
  assert.deepEqual(zoneReading('America/New_York', OCT), { time: '9:53 AM', day: 'Thu, Oct 1', abbr: 'EDT' })
  assert.deepEqual(zoneReading('America/Chicago', OCT), { time: '8:53 AM', day: 'Thu, Oct 1', abbr: 'CDT' })
  assert.deepEqual(zoneReading('America/Los_Angeles', OCT), { time: '6:53 AM', day: 'Thu, Oct 1', abbr: 'PDT' })
})

// Kills: typing the zone names. The strip removed on 2026-09-24 said
// "EST" in October; the same instant in January really is EST.
test('daylight time and standard time are named for the date', () => {
  assert.equal(zoneReading('America/Chicago', OCT).abbr, 'CDT')
  assert.equal(zoneReading('America/Chicago', JAN).abbr, 'CST')
  assert.equal(zoneReading('America/New_York', JAN).abbr, 'EST')
})

// Kills: a clock that shows the hour but not the day. Late in the
// evening on the West Coast it is already tomorrow in New York.
test('the day changes where the day changes', () => {
  const late = new Date('2026-10-02T04:30:00Z') // 9:30 PM Oct 1 in LA, 12:30 AM Oct 2 in NY
  assert.equal(zoneReading('America/Los_Angeles', late).day, 'Thu, Oct 1')
  assert.equal(zoneReading('America/New_York', late).day, 'Fri, Oct 2')
})

// Kills: marking the wrong clock as the company's, or none. Every time in
// the app is Central; that is the one to read the numbers in.
test('the company clock is the app clock, and only that one', () => {
  const marked = zoneClocks(OCT).filter((z) => z.company).map((z) => z.city)
  assert.deepEqual(marked, ['Chicago'])
  assert.equal(zoneClocks(OCT).length, 3)
})
