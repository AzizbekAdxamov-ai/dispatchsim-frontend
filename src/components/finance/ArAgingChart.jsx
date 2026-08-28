import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatMoney } from '../../utils/format'
import '../dashboard/Charts.css'
import '../fleet/FleetWidgets.css'

// Aging bucket color, keyed by bucket `key` — the API returns count/amount
// per bucket but no color (CLAUDE.md: colors are a frontend-only concern).
const BUCKET_COLOR = {
  '0-30': 'var(--green)',
  '31-60': 'var(--blue)',
  '61-90': 'var(--amber)',
  '90+': 'var(--red)',
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const bucket = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Outstanding: <b>{formatMoney(bucket.amountUsd)}</b></div>
      <div className="chart-tooltip-row">Invoices: <b>{bucket.count}</b></div>
    </div>
  )
}

export default function ArAgingChart({ data }) {
  return (
    <div className="widget area-widget">
      <div className="widget-title">Receivables aging</div>
      <div className="widget-sub">Outstanding by days past due</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
          <XAxis
            dataKey="label"
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
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border-soft)', opacity: 0.4 }} />
          <Bar dataKey="amountUsd" radius={[4, 4, 0, 0]}>
            {data.map((bucket) => (
              <Cell key={bucket.key} fill={BUCKET_COLOR[bucket.key] ?? 'var(--blue)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
