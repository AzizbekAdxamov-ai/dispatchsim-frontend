import { useParams, useNavigate, Link } from 'react-router-dom'
import { Phone, Envelope } from '@phosphor-icons/react'
import { FLEET_STATUS_LABEL } from '../data/fleetData'
import { getTruck } from '../api/fleet'
import { useResource } from '../hooks/useResource'
import { formatMiles, formatMonthDay, formatWeekday, formatMoney } from '../utils/format'
import WaveFuelGauge from '../components/fleet/WaveFuelGauge'
import CostDonut from '../components/fleet/CostDonut'
import TireRing from '../components/fleet/TireRing'
import FuelTrendChart from '../components/fleet/FuelTrendChart'
import WeeklyDistanceChart from '../components/fleet/WeeklyDistanceChart'
import '../components/fleet/FleetWidgets.css'
import './TruckDetail.css'

const STATUS_BADGE = {
  active: 'ontime',
  maintenance: 'warn',
  idle: 'neutral',
}

// `costBreakdown[].label` is a key ('fuel'/'maintenance'/'other'), not
// display text or a color — see fleet.service.js's buildCostBreakdown
// comment. The database stores neither the English label nor a color
// (CLAUDE.md: no hardcoded color on the backend), so both are mapped here.
const COST_LABEL = { fuel: 'Fuel', maintenance: 'Maintenance', other: 'Other' }
const COST_COLOR = { fuel: 'var(--accent)', maintenance: 'var(--blue)', other: 'var(--panel-3)' }

function Delta({ deltaPct, up, betterWhenUp = true }) {
  const good = up === betterWhenUp
  return (
    <div className={'truck-stat-delta' + (good ? ' good' : ' bad')}>
      {up ? '↑' : '↓'} {deltaPct}% {up ? 'up' : 'down'} vs last week
    </div>
  )
}

export default function TruckDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: truck, error, loading } = useResource((signal) => getTruck(id, signal), [id])

  if (loading) {
    return <div className="panel truck-detail-missing"><p>Loading truck…</p></div>
  }

  if (error?.code === 'TRUCK_NOT_FOUND') {
    return (
      <div className="panel truck-detail-missing">
        <p>Truck not found.</p>
        <Link to="/fleet">← Back to fleet</Link>
      </div>
    )
  }

  if (error || !truck) {
    return (
      <div className="panel truck-detail-missing">
        <p>Could not load truck{error ? ` — ${error.message}` : ''}.</p>
        <Link to="/fleet">← Back to fleet</Link>
      </div>
    )
  }

  const segments = truck.costBreakdown.map((seg) => ({
    label: COST_LABEL[seg.label] ?? seg.label,
    pct: seg.pct,
    color: COST_COLOR[seg.label] ?? 'var(--panel-3)',
  }))

  // The API returns each cost segment as a percentage share, not a dollar
  // total (see fleet.service.js — the total never leaves the backend).
  // The maintenance segment's share plus its known weekly dollar figure
  // (metrics.maintenanceCost) is enough to back into the week's total.
  const maintenancePct = truck.costBreakdown.find((s) => s.label === 'maintenance')?.pct ?? 0
  const weekTotalUsd = maintenancePct > 0
    ? Math.round(truck.metrics.maintenanceCost.value / (maintenancePct / 100))
    : truck.metrics.maintenanceCost.value

  const fuelTrendData = truck.fuelTrend.map((d) => ({ day: formatMonthDay(d.day), pct: d.fuelPct }))
  const maxDistanceMi = Math.max(0, ...truck.distanceTrend.map((d) => d.distanceMi))
  const distanceTrendData = truck.distanceTrend.map((d) => ({
    day: formatWeekday(d.day),
    mi: d.distanceMi,
    highlight: maxDistanceMi > 0 && d.distanceMi === maxDistanceMi,
  }))

  return (
    <div>
      <div className="truck-detail-crumbs">
        <button className="truck-detail-back" onClick={() => navigate('/fleet')}>← Fleet</button>
        <span className="truck-detail-sep">/</span>
        <span className="truck-detail-crumb-current">{truck.id} → Performance</span>
      </div>

      <div className="truck-detail-head">
        <div>
          <div className="truck-detail-id-row">
            <div className="truck-detail-id mono">{truck.id}</div>
            <span className={'badge ' + STATUS_BADGE[truck.status] + ' truck-detail-status-pill'}>
              <span className="dot"></span>
              {FLEET_STATUS_LABEL[truck.status]}
            </span>
          </div>
          <div className="truck-detail-meta">
            {truck.make} {truck.model} · {truck.year} · {formatMiles(truck.odometerMi)} on odometer
          </div>
        </div>
        <div className="truck-detail-actions">
          <button className="truck-detail-btn" disabled={!truck.driver}>
            <Envelope size={14} aria-hidden="true" /> Message driver
          </button>
          <button className="truck-detail-btn primary" disabled={!truck.driver}>
            <Phone size={14} aria-hidden="true" /> Call driver
          </button>
        </div>
      </div>

      <div className="truck-stat-mini-row">
        <div className="truck-stat-mini">
          <div className="truck-stat-mini-label">Miles this week</div>
          <div className="truck-stat-mini-value mono">{formatMiles(truck.metrics.weeklyDistance.value)}</div>
          <Delta {...truck.metrics.weeklyDistance} betterWhenUp />
        </div>
        <div className="truck-stat-mini">
          <div className="truck-stat-mini-label">Fuel economy</div>
          <div className="truck-stat-mini-value mono">{truck.metrics.mpg.value} mpg</div>
          <Delta {...truck.metrics.mpg} betterWhenUp />
        </div>
        <div className="truck-stat-mini">
          <div className="truck-stat-mini-label">Idle time</div>
          <div className="truck-stat-mini-value mono">{truck.metrics.idleHours.value} h</div>
          <Delta {...truck.metrics.idleHours} betterWhenUp={false} />
        </div>
        <div className="truck-stat-mini">
          <div className="truck-stat-mini-label">Service cost (wk.)</div>
          <div className="truck-stat-mini-value mono">{formatMoney(truck.metrics.maintenanceCost.value)}</div>
          <Delta {...truck.metrics.maintenanceCost} betterWhenUp={false} />
        </div>
      </div>

      <div className="widget-grid">
        <WaveFuelGauge
          pct={truck.fuelPct}
          gallons={truck.fuelGallons}
          capacity={truck.fuelCapacityGal}
          lastFueledDate={formatMonthDay(truck.lastFueledAt)}
          lastFueledLocation={truck.lastFueledLocation}
        />

        <CostDonut
          segments={segments}
          monthTotal={weekTotalUsd}
          centerLabel={segments[0].pct + '%'}
          sub={`This week — ${formatMoney(weekTotalUsd)}`}
        />

        <TireRing front={truck.tireFrontPct} rear={truck.tireRearPct} />

        <FuelTrendChart data={fuelTrendData} />

        <WeeklyDistanceChart data={distanceTrendData} />
      </div>
    </div>
  )
}
