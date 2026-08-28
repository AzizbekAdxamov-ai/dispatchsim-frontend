import { useCallback } from 'react'
import AlertStrip from '../components/dashboard/AlertStrip'
import StatCards from '../components/dashboard/StatCards'
import LoadBoard from '../components/dashboard/LoadBoard'
import DriverPanel from '../components/dashboard/DriverPanel'
import OnTimeChart from '../components/dashboard/OnTimeChart'
import UtilizationChart from '../components/dashboard/UtilizationChart'
import AlertQueue from '../components/dashboard/AlertQueue'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import CargoLayout from '../components/dashboard/CargoLayout/CargoLayout'
import DriverBoard from '../components/drivers/DriverBoard'
import { alerts, alertQueue, activityFeed } from '../data/mockData'
import { getDashboard } from '../api/stats'
import { listLoads } from '../api/loads'
import { listDrivers } from '../api/drivers'
import { useResource } from '../hooks/useResource'
import { getDriverStatus } from '../utils/driverStatus'
import { formatMoney, formatWeekday } from '../utils/format'
import '../components/dashboard/Panel.css'

// The driver-summary side panel is a compact preview (see DriverPanel),
// not the full roster — Drivers.jsx is the full list. Capped the same way
// AlertQueue's dashboard instance already caps itself (`limit={3}`).
const DRIVER_PANEL_LIMIT = 6
// LoadBoard here is a "what's moving right now" preview, not the full
// board (Loads.jsx is that) — capped for the same reason.
const LOAD_BOARD_LIMIT = 8

export default function Dashboard() {
  const fetchAll = useCallback(async (signal) => {
    const [stats, loadsRes, driversRes] = await Promise.all([
      getDashboard(signal),
      listLoads({ limit: 100 }, signal),
      listDrivers(signal),
    ])
    return { stats, loads: loadsRes.loads, drivers: driversRes.drivers }
  }, [])

  const { data, error, loading } = useResource(fetchAll, [])

  if (loading) return <div className="page-empty">Loading dashboard…</div>
  if (error) return <div className="page-empty">Could not load the dashboard — {error.message}</div>
  if (!data) return null

  const { stats, loads, drivers } = data

  const statCards = [
    { label: 'Active loads', value: stats.stats.activeLoads, delta: `${stats.stats.inTransit} in transit` },
    { label: 'On time', value: stats.stats.onTimePct + '%', tone: 'green', delta: `${stats.stats.onTimeLoads} of ${stats.stats.evaluatedLoads} loads` },
    { label: 'At risk', value: stats.stats.atRisk, tone: 'amber', delta: 'delay likely' },
    { label: 'Drivers available', value: stats.stats.driversAvailable, delta: `of ${stats.stats.driversTotal} total` },
    { label: 'Week revenue', value: formatMoney(stats.stats.weekRevenueUsd), mono: true, delta: `vs. ${formatMoney(stats.stats.previousWeekRevenueUsd)} last week` },
  ]

  const onTimeTrendData = stats.onTimeTrend.map((r) => ({ day: formatWeekday(r.day), onTime: r.onTimePct }))
  const utilizationTrendData = stats.utilizationTrend.map((r) => ({ day: formatWeekday(r.day), utilization: r.utilization, distance: r.distanceMi }))

  const activeLoads = loads.filter((l) => l.status !== 'done').slice(0, LOAD_BOARD_LIMIT)
  const enrichedDrivers = drivers.map((d) => ({ ...d, ...getDriverStatus(d) }))

  return (
    <>
      <AlertStrip items={alerts} />
      <StatCards stats={statCards} />
      <div className="grid-2">
        <LoadBoard loads={activeLoads} />
        <DriverPanel drivers={enrichedDrivers.slice(0, DRIVER_PANEL_LIMIT)} />
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AlertQueue alerts={alertQueue} limit={3} />
          <ActivityFeed items={activityFeed} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UtilizationChart data={utilizationTrendData} />
          <OnTimeChart data={onTimeTrendData} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <DriverBoard drivers={drivers} />
      </div>

      <div style={{ marginTop: 16 }}>
        <CargoLayout />
      </div>
    </>
  )
}
