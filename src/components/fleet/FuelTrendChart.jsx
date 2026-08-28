import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import '../dashboard/Charts.css'
import './FleetWidgets.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Fuel: <b>{payload[0].value}%</b></div>
    </div>
  )
}

export default function FuelTrendChart({ data }) {
  return (
    <div className="widget area-widget">
      <div className="widget-title">Fuel level — last 7 days</div>
      <div className="widget-sub">Percent of tank</div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fuelTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border-soft)" />
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-3)', fontSize: 9.5 }}
            axisLine={{ stroke: 'var(--border-soft)' }}
            tickLine={false}
          />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-soft)' }} />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#fuelTrendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
