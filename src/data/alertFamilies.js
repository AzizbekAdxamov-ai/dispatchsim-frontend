// Alert families a fleet manager acts on. One list, read by the Fleet alerts
// board and by the top bar's bell, so the two can never disagree.
export const FLEET_ALERT_FAMILIES = Object.freeze(['driver.idle', 'driver.no-truck', 'driver.pay-overdue', 'listing.leaving'])
