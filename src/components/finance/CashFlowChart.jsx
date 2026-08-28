import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMoney, formatMonthDay } from '../../utils/format'
import '../dashboard/Charts.css'
import '../fleet/FleetWidgets.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const revenue = payload.find((p) => p.dataKey === 'revenueUsd')?.value ?? 0
  const expenses = payload.find((p) => p.dataKey === 'expensesUsd')?.value ?? 0
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Revenue: <b>{formatMoney(revenue)}</b></div>
      <div className="chart-tooltip-row">Expenses: <b>{formatMoney(expenses)}</b></div>
    </div>
  )
}

export default function CashFlowChart({ data }) {
  const chartData = data.map((d) => ({ ...d, weekLabel: formatMonthDay(d.weekStart) }))

  return (
    <div className="widget area-widget">
      <div className="widget-title">Cash flow</div>
      <div className="widget-sub">Revenue vs operating cost — last 8 weeks</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFlowRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border-soft)" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: 'var(--text-3)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--border-soft)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-soft)' }} />
          <Area
            type="monotone"
            dataKey="revenueUsd"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#cashFlowRevenueFill)"
          />
          <Line
            type="monotone"
            dataKey="expensesUsd"
            stroke="var(--red)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
