import { FLEET_ALERT_FAMILIES } from '../../data/alertFamilies.js'

// What each workspace's top bar shows. Plain data in a .js file so node:test
// can pin it. Links point into the dispatcher workspace only where the
// workspace itself lets the user in -- see topbarParts().
const OFF = { quickLinks: false, clocks: false, cash: false, bell: false, cashTo: null, alertsTo: null, families: null }

export const TOPBAR_VARIANTS = Object.freeze({
  dispatch: { quickLinks: true, clocks: true, cash: true, bell: true, cashTo: '/cash', alertsTo: '/alerts', families: null },
  fleet: { quickLinks: true, clocks: true, cash: true, bell: true, cashTo: '/cash', alertsTo: '/fleet/alerts', families: FLEET_ALERT_FAMILIES },
  finance: { quickLinks: false, clocks: true, cash: true, bell: false, cashTo: '/finance/cashflow', alertsTo: null, families: null },
  minimal: OFF,
})

// A user without the dispatcher role is bounced away from /loads, /map and
// /cash, so those links would be dead ends: drop them (the cash balance
// stays, as plain text).
export function topbarParts(variant, roles = []) {
  const base = TOPBAR_VARIANTS[variant] ?? TOPBAR_VARIANTS.minimal
  if (roles?.includes('dispatcher')) return base
  return {
    ...base,
    quickLinks: false,
    cashTo: base.cashTo === '/cash' ? null : base.cashTo,
  }
}
