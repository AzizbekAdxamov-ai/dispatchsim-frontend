// Single formatting layer for every raw value the API returns. The backend
// sends RAW numbers/ISO timestamps only (weightLbs: 28700, pickupAt:
// '2026-08-19T13:00:00Z', ...) — every page renders through here so a
// number is never hand-formatted twice in two different ways.
//
// ⚠️ Timezone: the user (Azizbek) is in Uzbekistan (UTC+5); the product is
// a US dispatch operation. Every date/time formatter below pins
// `America/Chicago` through this single APP_TIMEZONE constant so a
// `13:00Z` pickup renders the same "08:00" a Dallas dispatcher would see,
// not whatever the viewer's browser timezone happens to be.
export const APP_TIMEZONE = 'America/Chicago'

function isNil(v) {
  return v === null || v === undefined
}

export function formatWeight(lbs) {
  if (isNil(lbs)) return '—'
  return `${Math.round(lbs).toLocaleString('en-US')} lbs`
}

export function formatDistance(mi) {
  if (isNil(mi)) return '—'
  return `${Math.round(mi).toLocaleString('en-US')} mi`
}

export function formatMiles(mi) {
  if (isNil(mi)) return '—'
  return `${Math.round(mi).toLocaleString('en-US')} mi`
}

// Whole-dollar display — matches how every stat card / table in the app
// has always shown money (no cents). Fractional money (rpm, per-mile
// costs) is formatted separately by its own caller with toFixed(2), same
// as the mock did.
export function formatMoney(usd) {
  if (isNil(usd)) return '—'
  return `$${Math.round(usd).toLocaleString('en-US')}`
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatMonthDay(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatMonthYear(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatWeekday(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(d)
}

// Minutes → 'Xh Ym', minutes zero-padded — matches the driver HOS/hours
// strings the mock hand-wrote ('6h 20m', '11h 00m'). Used for HOS
// remaining, hours-today and hours-this-week alike (all raw *_min columns).
export function formatHos(min) {
  if (isNil(min)) return '—'
  const abs = Math.max(0, Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Minutes → 'Xd Yh' | 'Xh Ym' | 'Xm', NOT zero-padded — for durations that
// can run past a day (an ETA on an 862 mi flatbed load), matching the
// mock's 'ETA 1d 4h' / 'ETA 1h 8m' style.
function formatDurationLong(min) {
  const abs = Math.max(0, Math.round(Math.abs(min)))
  const days = Math.floor(abs / 1440)
  const hours = Math.floor((abs % 1440) / 60)
  const mins = abs % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// `etaAt` vs `dueAt` (the load's scheduled delivery window): if the ETA
// lands after the due time, the load is running behind and we say by how
// much; otherwise we show time remaining until the ETA. Neither timestamp
// is guaranteed present (a load with no driver yet has no etaAt).
export function formatEta(etaAt, dueAt) {
  if (!etaAt) return null
  const etaMs = new Date(etaAt).getTime()
  if (Number.isNaN(etaMs)) return null
  const dueMs = dueAt ? new Date(dueAt).getTime() : null

  if (dueMs != null && !Number.isNaN(dueMs) && etaMs > dueMs) {
    const behindMin = (etaMs - dueMs) / 60000
    return `${formatDurationLong(behindMin)} behind schedule`
  }

  const diffMin = (etaMs - Date.now()) / 60000
  if (diffMin <= 0) return 'Arriving shortly'
  return `ETA ${formatDurationLong(diffMin)}`
}

export function formatCdl(cdlClass, cdlNumber) {
  if (!cdlClass && !cdlNumber) return '—'
  return `CDL-${cdlClass ?? '—'} · ${cdlNumber ?? '—'}`
}

export function formatPlace(city, state) {
  if (!city && !state) return '—'
  if (!state) return city
  if (!city) return state
  return `${city}, ${state}`
}

// `truck` is the compact { id, make, model, ... } summary embedded on a
// load/driver row — `id` is the plate number.
export function formatUnit(truck) {
  if (!truck) return '—'
  return `${truck.make} — ${truck.id}`
}

// x10 fixed-point rating (49 → 4.9) — avoids storing/transmitting a float.
export function formatRating(x10) {
  if (isNil(x10)) return '—'
  return (x10 / 10).toFixed(1)
}
