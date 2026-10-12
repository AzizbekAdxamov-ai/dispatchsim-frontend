// The Live tracking panel's words, from the backend's `tracking` object
// (backend src/modules/tracking/liveTracking.js -- the map's own position).
// Pure, so a test can hold it. Facts only: miles, why the truck is not
// moving and since when, the ETA beside the promise made to the broker
// (the run's own clock -- not the posting's calendar dates).

import { formatDateTime, formatDurationLong, formatPlace } from '../../utils/format.js'

const STOP_KIND = { fuel: 'fuel stop', rest: 'rest stop' }

function sinceText(iso, now) {
  if (!iso) return ''
  const min = (now.getTime() - new Date(iso).getTime()) / 60000
  return ` since ${formatDateTime(iso)}${min > 0 ? ` (${formatDurationLong(min)})` : ''}`
}

export function liveTrackingLines(t, load, now = new Date()) {
  if (!t) return []
  const mi = (n) => Number(n).toLocaleString('en-US')
  const lines = [`Mile ${mi(t.milesDone)} of ${mi(t.milesTotal)}`]

  if (t.state === 'event') {
    lines.push(`Stopped: ${t.reason}${sinceText(t.since, now)}. The truck does not move until a choice is made.`)
  } else if (t.state === 'stop') {
    const where = t.place ? `${t.place.name}, ${formatPlace(t.place.city, t.place.state)}` : 'a planned stop'
    lines.push(`At ${where} — ${STOP_KIND[t.reason] ?? 'planned stop'}${sinceText(t.since, now)}`)
  } else if (t.state === 'arrived') {
    lines.push(`At ${formatPlace(load.destinationCity, load.destinationState)}${sinceText(t.since, now)} — delivery is being recorded.`)
  } else {
    lines.push(`On the road — ${mi(Math.max(0, t.milesTotal - t.milesDone))} mi to go`)
  }

  let eta = `ETA ${formatDateTime(t.etaAt)} · promised ${formatDateTime(t.promisedEtaAt)}`
  if (t.etaPastPromiseMin != null) eta += ` — ${formatDurationLong(t.etaPastPromiseMin)} after the promise`
  lines.push(eta)

  if (t.geometrySource === 'arc') {
    lines.push('Position is approximate: the road route for this lane has not been loaded.')
  }
  return lines
}
