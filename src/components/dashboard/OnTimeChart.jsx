import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './Charts.css'
import './Panel.css'

function ChartTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload?.length || payload[0].value == null) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">{valueLabel}: <b>{payload[0].value}%</b></div>
    </div>
  )
}

export default function OnTimeChart({ data, labels }) {
  const hasTrendData = data.some((day) => day.onTime != null)

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          {labels.title}
          <div className="panel-subtitle">{labels.subtitle}</div>
        </div>
      </div>
      {hasTrendData ? (
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
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
                width={40}
              />
              <Tooltip content={<ChartTooltip valueLabel={labels.value} />} cursor={{ stroke: 'var(--border-soft)' }} />
              <Area
                type="monotone"
                dataKey="onTime"
                stroke="var(--blue)"
                strokeWidth={2}
                fill="url(#onTimeFill)"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty" role="status">{labels.empty}</div>
      )}
    </div>
  )
}
