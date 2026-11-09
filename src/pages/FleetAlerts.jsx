import AlertsBoard from '../components/alerts/AlertsBoard'

// The fleet manager's board.
//
// This page used to promise alerts for tyre wear, overdue maintenance and
// low fuel. All three read columns that nothing writes at runtime --
// trucks.fuel_pct is set once at purchase, tire_front_pct and
// tire_rear_pct never change, and maintenance_records has no writer
// outside the seed. Those alerts could not have fired, in the same way
// lateness could not fire before promised_eta_at existed, and an empty
// screen would have read as "the fleet is fine".
//
// So the page shows the fleet conditions the data can actually answer, and
// says which ones it cannot.
const FLEET_FAMILIES = ['driver.idle', 'driver.no-truck', 'driver.pay-overdue', 'listing.leaving']

export default function FleetAlerts() {
  return (
    <AlertsBoard
      title="Alerts"
      sub="Fleet conditions that are true right now."
      families={FLEET_FAMILIES}
      // Was "nothing updates them while the simulator runs": a banned word,
      // and no longer true -- fuel and tire wear move with every run since
      // migration 032 (alerts.catalog.js). What is still true: no alert
      // family reads them yet.
      note="Not alerted on yet: fuel level, tire wear and maintenance intervals."
    />
  )
}
