// The three US clocks in the top bar: what time -- and what DAY -- it is
// on the East Coast, in the middle, and on the West Coast.
//
// They were removed on 2026-09-24 ("we don't teach time zones yet") and
// asked back on 2026-10-01: Azizbek, working from Tashkent, kept losing
// track of which day and hour a pickup meant. A dispatcher in the US
// carries these three clocks in their head; someone ten hours away needs
// them on the screen.
//
// Two things are different from the strip that was removed:
//
//   The zone names are read from the date, not typed. The old strip said
//   "EST / CST / PST" all year -- wrong for eight months of it, because
//   from March to November the US is on daylight time (EDT / CDT / PDT).
//   Intl knows which one applies on any given day; a label typed into an
//   array does not.
//
//   The day is shown with the hour. "8:53 AM" is half an answer when the
//   question is whether "pickup Friday" is tomorrow or the day after.
//
// And the company's own clock is marked. Every time this app shows -- the
// board, the loads, what the broker and the driver say -- is on
// APP_TIMEZONE (Central). The other two are for context; that one is the
// one the numbers are in.
//
// Pure: a date in, readings out. node:test imports it directly.

import { APP_TIMEZONE } from './format.js'

export const ZONES = Object.freeze([
  { tz: 'America/New_York', city: 'New York' },
  { tz: 'America/Chicago', city: 'Chicago' },
  { tz: 'America/Los_Angeles', city: 'Los Angeles' },
])

// 12-hour, like every other time in the app ("Fri 5:06 AM" on the board,
// "8:53 AM" from the broker). The old strip was 24-hour, and a screen
// that says 15:06 in one corner and 3:06 PM in another is two clocks to
// translate between instead of one.
export function zoneReading(tz, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZoneName: 'short',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  )
  return {
    time: `${parts.hour}:${parts.minute} ${parts.dayPeriod}`,
    day: `${parts.weekday}, ${parts.month} ${parts.day}`,
    abbr: parts.timeZoneName,
  }
}

export function zoneClocks(date = new Date()) {
  return ZONES.map((z) => ({ ...z, ...zoneReading(z.tz, date), company: z.tz === APP_TIMEZONE }))
}
