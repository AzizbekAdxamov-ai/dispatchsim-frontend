import { motion } from 'framer-motion'
import AlertStrip from '../components/dashboard/AlertStrip'
import TruckCard from '../components/fleet/TruckCard'
import { fleetAlerts } from '../data/fleetData'
import { listTrucks } from '../api/fleet'
import { useResource } from '../hooks/useResource'
import './FleetDashboard.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const card = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function FleetDashboard() {
  const { data, error, loading } = useResource((signal) => listTrucks(signal), [])

  // fleetAlerts is out of scope this round (FleetAlerts.jsx is not
  // touched) — the alert strip stays mock-backed.
  const alertItems = fleetAlerts.map((a) => ({ strong: a.truckId, text: a.title }))

  const trucks = data?.trucks ?? []
  const counts = data?.meta?.counts
  const avgFuelPct = data?.meta?.avgFuelPct

  return (
    <>
      <AlertStrip items={alertItems} />

      <div className="page-head">
        <div>
          <div className="page-title">Fleet overview</div>
          <div className="page-sub">{loading ? 'Loading…' : `${trucks.length} trucks — live status and performance`}</div>
        </div>
      </div>

      <div className="fleet-summary-row">
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Active</div>
          <div className="fleet-summary-value green">{counts ? counts.active : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">In maintenance</div>
          <div className="fleet-summary-value amber">{counts ? counts.maintenance : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Idle</div>
          <div className="fleet-summary-value">{counts ? counts.idle : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Avg fuel level</div>
          <div className="fleet-summary-value mono">{avgFuelPct != null ? `${avgFuelPct}%` : '—'}</div>
        </div>
      </div>

      {loading && <div className="page-empty">Loading trucks…</div>}
      {!loading && error && <div className="page-empty">Could not load the fleet — {error.message}</div>}
      {!loading && !error && trucks.length === 0 && <div className="page-empty">No trucks in the fleet yet.</div>}

      {!loading && !error && trucks.length > 0 && (
        <motion.div className="truck-card-grid" variants={container} initial="hidden" animate="show">
          {trucks.map((truck) => (
            <TruckCard key={truck.id} truck={truck} variants={card} />
          ))}
        </motion.div>
      )}
    </>
  )
}
