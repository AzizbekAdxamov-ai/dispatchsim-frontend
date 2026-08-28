import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useState } from 'react'
import './Charts.css'
import './Panel.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Utilization: <b>{item.utilization}%</b></div>
      <div className="chart-tooltip-row">Distance: <b>{item.distance.toLocaleString()} mi</b></div>
    </div>
  )
}

export default function UtilizationChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null)

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Fleet utilization trend
          <div className="panel-subtitle">Weekly utilization % and total distance</div>
        </div>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
            onMouseMove={(state) => setActiveIndex(state?.isTooltipActive ? state.activeTooltipIndex : null)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
              axisLine={{ stroke: 'var(--border-soft)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border-soft)', opacity: 0.4 }} />
            <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} className={'util-bar' + (i === activeIndex ? ' active' : '')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
