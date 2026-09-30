// The search, as data: how a place is written, what it narrows by, and
// where a picked day begins and ends.
//
// Plain JavaScript, in its own file, for two reasons. A .jsx file that
// exports anything but components loses fast refresh -- and these are
// exactly the parts worth testing on their own, which a test runner
// cannot do through JSX.
import { ZONE_ORDER, ZONE_LABEL } from '../../data/zones.js'
import { APP_TIMEZONE } from '../../utils/format.js'

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY',
]

export function placeLabel(place) {
  if (!place) return ''
  if (place.kind === 'city') return `${place.city}, ${place.state}`
  if (place.kind === 'state') return place.state
  if (place.kind === 'zone') return ZONE_LABEL[place.zone] ?? place.zone
  return ''
}

// A place -> the query parameters it stands for, on each side of the trip.
// Kept next to the input that produces it, so the page never has to know
// that a zone is a set of states.
export function originParams(place) {
  if (!place) return {}
  if (place.kind === 'city') return { fromCity: place.city, fromState: place.state }
  if (place.kind === 'state') return { originState: place.state }
  if (place.kind === 'zone') return { originZone: place.zone }
  return {}
}

export function destinationParams(place) {
  if (!place) return {}
  if (place.kind === 'city') return { toCity: place.city, toState: place.state }
  if (place.kind === 'state') return { destinationState: place.state }
  if (place.kind === 'zone') return { destinationZone: place.zone }
  return {}
}

// A picked day -> the instant it begins, on the board's clock.
//
// Every time on this board is shown in America/Chicago (utils/format.js's
// APP_TIMEZONE): a 13:00Z pickup reads as 08:00 because that is what the
// dispatcher in Dallas sees. The date picker has to agree with the column
// it filters. Reading "2026-09-26" as a browser-local day would ask for a
// different window in Tashkent than in Dallas, and reading it as UTC --
// which `new Date('2026-09-26')` does -- would start the day five hours
// early and show loads from the evening before.
//
// The offset is found by asking Intl what that instant looks like in the
// zone, and applied twice: on the two days a year the offset changes, the
// first pass lands an hour off and the second corrects it.
function zoneOffsetMs(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  )
  return asUtc - instant.getTime()
}

function zonedMidnight(year, month, day) {
  const wall = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  let ms = wall - zoneOffsetMs(new Date(wall), APP_TIMEZONE)
  ms = wall - zoneOffsetMs(new Date(ms), APP_TIMEZONE)
  return new Date(ms)
}

export function dayStart(yyyymmdd) {
  if (!yyyymmdd) return null
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return null
  return zonedMidnight(y, m, d)
}

// The instant the NEXT day begins, which is the exclusive upper bound the
// server takes. Built by adding one to the day number rather than 24
// hours to the instant: the day DST ends is 25 hours long.
export function dayAfter(yyyymmdd) {
  if (!yyyymmdd) return null
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return null
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
}

// What the typed text can mean: a state code, a zone, or one of the cities
// the board knows. States first because two letters are unambiguous, then
// zones, then cities -- a dispatcher typing "PA" wants Pennsylvania, not
// Palmdale.
export function matchPlaces(text, cities) {
  const q = text.trim().toLowerCase()
  if (q === '') return []
  const out = []

  for (const code of US_STATES) {
    if (code.toLowerCase().startsWith(q)) out.push({ kind: 'state', state: code })
  }
  for (const zone of ZONE_ORDER) {
    if ((ZONE_LABEL[zone] ?? zone).toLowerCase().includes(q)) out.push({ kind: 'zone', zone })
  }
  for (const c of cities) {
    if (`${c.city}, ${c.state}`.toLowerCase().includes(q)) {
      out.push({ kind: 'city', city: c.city, state: c.state })
    }
  }
  return out.slice(0, 12)
}

// The draft the bar holds -> the query the API takes. One place, so that
// the page, the poll and the saved search all send the same thing.
//
// A radius without a city is dropped rather than sent: the server measures
// a radius from a point, and a state has no point. The input is disabled
// in that state, but a saved search can carry both.
export function toFilters(draft) {
  const origin = originParams(draft.origin)
  const destination = destinationParams(draft.destination)
  const filters = { ...origin, ...destination }

  if (draft.equipmentType?.length > 0) filters.equipmentType = draft.equipmentType
  if (draft.dhO != null && draft.origin?.kind === 'city') filters.maxDeadheadMi = draft.dhO
  if (draft.dhD != null && draft.destination?.kind === 'city') filters.maxDeadheadDestMi = draft.dhD
  if (draft.maxLengthFt != null) filters.maxLengthFt = draft.maxLengthFt
  if (draft.maxWeightLbs != null) filters.maxWeightLbs = draft.maxWeightLbs
  if (draft.minRatePerMile != null) filters.minRatePerMile = draft.minRatePerMile

  const from = dayStart(draft.pickupFromDay)
  const before = dayAfter(draft.pickupToDay ?? draft.pickupFromDay)
  if (from) filters.pickupFrom = from
  if (before) filters.pickupBefore = before

  filters.sort = draft.sort ?? 'posted'
  return filters
}
