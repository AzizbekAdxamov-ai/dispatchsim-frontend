import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import '../dashboard/Charts.css'
import './FleetWidgets.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Miles: <b>{payload[0].value.toLocaleString()} mi</b></div>
    </div>
  )
}

export default function WeeklyDistanceChart({ data }) {
  return (
    <div className="widget">
      <div className="widget-title">Weekly miles</div>
      <div className="widget-sub">Miles per day</div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-3)', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border-soft)', opacity: 0.4 }} />
          <Bar dataKey="mi" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.day} fill={d.highlight ? 'var(--accent)' : d.mi === 0 ? 'var(--panel-3)' : 'var(--blue)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
