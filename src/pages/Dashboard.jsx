import { useCallback } from 'react'
import CargoLayout from '../components/dashboard/CargoLayout/CargoLayout'
import StatCards from '../components/dashboard/StatCards'
import LoadBoard from '../components/dashboard/LoadBoard'
import DriverPanel from '../components/dashboard/DriverPanel'
import OnTimeChart from '../components/dashboard/OnTimeChart'
import UtilizationChart from '../components/dashboard/UtilizationChart'

import DriverBoard from '../components/drivers/DriverBoard'
import TrackingBoard from '../components/tracking/TrackingBoard'
import { getDashboard } from '../api/stats'
import { listLoads } from '../api/loads'
import { listDrivers } from '../api/drivers'
import { useResource } from '../hooks/useResource'
import { getDriverStatus } from '../utils/driverStatus'
import { formatMoney, formatWeekday } from '../utils/format'
import '../components/dashboard/Panel.css'

// The driver-summary side panel is a compact preview (see DriverPanel),
// not the full roster — Drivers.jsx is the full list, and this is capped
// the same way the top-bar alert panel is (AlertsBell's PANEL_LIMIT).
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

  const { data, error, loading } = useResource(fetchAll, [], { pollMs: 20000 })

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
      <StatCards stats={statCards} />
      <div className="grid-2">
        <LoadBoard loads={activeLoads} />
        <DriverPanel drivers={enrichedDrivers.slice(0, DRIVER_PANEL_LIMIT)} />
      </div>

      <div style={{ marginTop: 16 }}>
        <UtilizationChart data={utilizationTrendData} />
      </div>
      <div style={{ marginTop: 16 }}>
        <OnTimeChart data={onTimeTrendData} />
      </div>

      {/* The fleet map, where the day starts: the same board Tracking
          renders -- one implementation, two pages. Embedded mode swaps the
          full-height rule for a card height; panel, polls and map are
          identical to the Tracking page. */}
      <div className="dashboard-map" style={{ marginTop: 16 }}>
        <TrackingBoard embedded />
      </div>

      <div style={{ marginTop: 16 }}>
        <DriverBoard drivers={drivers} />
      </div>

      <div style={{ marginTop: 16 }}>
        {/* Back on 2026-09-10, with real loads behind it.
            
            It was removed two days earlier for rendering ten hardcoded
            shipments — invented clients, invented shipment numbers, a
            "Fully loaded" trailer on the dashboard of a company that might
            own nothing, and a coloured "Risk score" grading each one. The
            note left here then said there was no cargo model to rewire to.
            That was true then and is not now: a dispatched load carries a
            real commodity, a real weight, a real lane and a real trailer.
            
            `loads` is the same array the rest of this page already has, so
            this costs no extra request and refreshes on the same 20-second
            poll as everything else. */}
        <CargoLayout loads={loads} />
      </div>
    </>
  )
}
