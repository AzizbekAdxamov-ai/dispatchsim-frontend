import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import '../dashboard/Charts.css'
import './FleetWidgets.css'
import './CostDonut.css'

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-row">{item.label}: <b>{item.pct}%</b></div>
    </div>
  )
}

export default function CostDonut({ segments, monthTotal, centerLabel,
  title = 'Cost breakdown', sub = `This month — $${monthTotal.toLocaleString()}` }) {
  return (
    <div className="widget">
      <div className="widget-title">{title}</div>
      <div className="widget-sub">{sub}</div>
      <div className="donut-wrap">
        <div className="donut-chart">
          <PieChart width={96} height={96}>
            <Pie
              data={segments}
              dataKey="pct"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={48}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {segments.map((seg) => (
                <Cell key={seg.label} fill={seg.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
          <div className="donut-center">{centerLabel}</div>
        </div>
        <div className="donut-legend">
          {segments.map((seg) => (
            <div className="legend-item" key={seg.label}>
              <span className="legend-dot" style={{ background: seg.color }} />
              {seg.label} — {seg.pct}%
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
