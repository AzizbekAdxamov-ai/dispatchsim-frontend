// Display labels for the truck spec sheet, and the order they read in.
//
// Mirrors the closed sets in migration 020. Keys, not sentences, live in
// the database — the same rule equipmentTypes.js follows — so a label can
// change here without a migration.
export const TRANSMISSION_LABEL = {
  'manual-10': '10-speed manual',
  'manual-13': '13-speed manual',
  'automated-12': '12-speed automated',
}

export const SLEEPER_LABEL = {
  'day-cab': 'Day cab',
  'sleeper-72': '72" raised roof sleeper',
  'sleeper-82': '82" raised roof sleeper',
}

export const SUSPENSION_LABEL = {
  'air-ride': 'Air ride',
  spring: 'Spring',
}

const lbs = (n) => (n == null ? null : `${n.toLocaleString()} lbs`)

// One row per field, in the order a spec sheet is actually read: what it
// is, what pulls it, what it can legally carry, then where it sits.
// A field with no value is dropped rather than shown as "—" so an older
// listing does not read as a broken page.
export function specRows(t) {
  if (!t) return []
  const rows = [
    ['VIN', t.vin],
    ['Engine', t.engineMake && t.engineModel ? `${t.engineMake} ${t.engineModel}` : null],
    ['Horsepower', t.horsepower ? `${t.horsepower} hp` : null],
    ['Transmission', TRANSMISSION_LABEL[t.transmission]],
    ['Cab', SLEEPER_LABEL[t.sleeper]],
    ['Suspension', SUSPENSION_LABEL[t.suspension]],
    ['Axles', t.axleConfig],
    ['Wheelbase', t.wheelbaseIn ? `${t.wheelbaseIn} in` : null],
    ['Front axle', lbs(t.frontAxleLbs)],
    ['Rear axle', lbs(t.rearAxleLbs)],
    ['GVWR', lbs(t.gvwrLbs)],
    ['APU', t.hasApu == null ? null : t.hasApu ? 'Yes' : 'No'],
    ['Located', t.locationCity && t.locationState ? `${t.locationCity}, ${t.locationState}` : null],
  ]
  return rows.filter(([, value]) => value != null && value !== '')
}
