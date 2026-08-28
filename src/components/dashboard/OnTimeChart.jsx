import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './Charts.css'
import './Panel.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">On time: <b>{payload[0].value}%</b></div>
    </div>
  )
}

export default function OnTimeChart({ data }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          On-time delivery performance
          <div className="panel-subtitle">Weekly on-time vs. delayed percentage</div>
        </div>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="onTimeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
              axisLine={{ stroke: 'var(--border-soft)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-soft)' }} />
            <Area
              type="monotone"
              dataKey="onTime"
              stroke="var(--blue)"
              strokeWidth={2}
              fill="url(#onTimeFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
