// Derives the UI-facing driver status (state/status label/meta text) from
// the three raw fields the API returns: `dutyStatus`, `currentLoad` and
// `hosRemainingMin`. The old mock stored these as their own hand-written
// columns (`state`, `status`, `meta`) — the database dropped them (they
// are not real facts, they are a presentation of the three raw ones), so
// this is their new home. CLAUDE.md: no hardcoded UI copy lives on the
// backend, so this mapping belongs here, not in a service file.
import { formatHos, formatPlace } from './format'

// A driver actively driving with under an hour of HOS left needs to
// surface as an HOS-limit warning before anything else, same priority the
// mock's hand-picked driver rows implied (Elena Petrova: driving + 45 min
// left → "HOS limit", not "On route").
const HOS_WARNING_THRESHOLD_MIN = 60

export function getDriverStatus(driver) {
  if (!driver) {
    return { state: 'off', status: 'Off duty', meta: '', hos: '—', hosLabel: 'off duty' }
  }

  const home = formatPlace(driver.homeBaseCity, driver.homeBaseState)
  const dest = driver.currentLoad
    ? formatPlace(driver.currentLoad.destinationCity, driver.currentLoad.destinationState)
    : null

  let state
  let status
  let meta

  if (driver.dutyStatus === 'driving' && driver.hosRemainingMin != null && driver.hosRemainingMin <= HOS_WARNING_THRESHOLD_MIN) {
    state = 'hos'
    status = 'HOS limit'
    meta = dest ? `Driving — approaching ${dest}` : 'Driving — approaching HOS limit'
  } else if (driver.dutyStatus === 'driving') {
    state = 'on'
    status = 'On route'
    meta = driver.currentLocation ? `Driving — ${driver.currentLocation}` : dest ? `Driving — approaching ${dest}` : 'Driving'
  } else if (driver.dutyStatus === 'on-duty') {
    state = 'on'
    status = 'Available'
    meta = `Available — ${home} yard`
  } else if (driver.dutyStatus === 'resting') {
    state = 'off'
    status = 'Off duty'
    meta = driver.currentLocation ? `Off duty — ${driver.currentLocation}` : `Off duty — ${home}`
  } else {
    state = 'off'
    status = 'Home'
    meta = `Home — ${home}`
  }

  return {
    state,
    status,
    meta,
    hos: driver.dutyStatus === 'off' ? '—' : formatHos(driver.hosRemainingMin),
    hosLabel: driver.dutyStatus === 'off' ? 'off duty' : 'HOS left',
  }
}
