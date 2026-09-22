import { DUTY_STATUSES } from './dutyStatus'
import { segmentsForDay, totalsForDay } from './eldLog'
import './EldLogGrid.css'

// The record-of-duty-status grid: 24 hours across, the four duty statuses
// down (OFF / SB / D / ON), one continuous line stepping between rows,
// the day's total per status on the right. This layout is the FMCSA
// graph-grid format (49 CFR 395.8(g)); every ELD prints the same one.
//
// Times arrive on the compressed calendar; `dayStart`/`dayEnd` bound one
// simulated day, so position on the grid is simply the fraction of that
// window -- hour 13 of the grid is 13/24 of the way through the day.
// Everything after `now` is the plan for the rest of the run, drawn
// dashed: it is not on the log until it happens.

const W = 960
const LABEL_W = 44
const TOTAL_W = 64
const ROW_H = 28
const TOP = 22
const GRID_W = W - LABEL_W - TOTAL_W
const H = TOP + ROW_H * DUTY_STATUSES.length + 6

const HOUR_LABELS = ['M', ...Array.from({ length: 11 }, (_, i) => String(i + 1)), 'N', ...Array.from({ length: 11 }, (_, i) => String(i + 1)), 'M']

function rowY(key) {
  const i = DUTY_STATUSES.findIndex((s) => s.key === key)
  return TOP + ROW_H * i + ROW_H / 2
}

export default function EldLogGrid({ events, dayStart, dayEnd, now }) {
  const dayStartMs = new Date(dayStart).getTime()
  const dayEndMs = new Date(dayEnd).getTime()
  const nowMs = new Date(now).getTime()
  const segments = segmentsForDay(events, dayStartMs, dayEndMs, nowMs)
  const totals = totalsForDay(segments)
  const x = (f) => LABEL_W + f * GRID_W

  const paths = { recorded: '', planned: '' }
  let prev = null
  for (const seg of segments) {
    const key = seg.planned ? 'planned' : 'recorded'
    const y = rowY(seg.status)
    const connect = prev && Math.abs(prev.to - seg.from) < 1e-6 && prev.planned === seg.planned
    paths[key] += connect ? ` L${x(seg.from)},${y}` : ` M${x(seg.from)},${y}`
    paths[key] += ` L${x(seg.to)},${y}`
    prev = seg
  }

  const nowFrac = (nowMs - dayStartMs) / (dayEndMs - dayStartMs)

  return (
    <svg className="eld-grid" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Record of duty status for the day">
      {HOUR_LABELS.map((label, h) => (
        <text key={`h${h}`} x={x(h / 24)} y={TOP - 8} className="eld-hour">{label}</text>
      ))}
      {DUTY_STATUSES.map((s, i) => (
        <g key={s.key}>
          <rect x={LABEL_W} y={TOP + ROW_H * i} width={GRID_W} height={ROW_H} className={i % 2 ? 'eld-row alt' : 'eld-row'} />
          <text x={LABEL_W - 8} y={TOP + ROW_H * i + ROW_H / 2 + 4} className="eld-row-label">{s.short}</text>
          <text x={W - 6} y={TOP + ROW_H * i + ROW_H / 2 + 4} className="eld-total">
            {`${Math.floor(Math.round(totals[s.key]) / 60)}:${String(Math.round(totals[s.key]) % 60).padStart(2, '0')}`}
          </text>
        </g>
      ))}
      {Array.from({ length: 25 }, (_, h) => (
        <line key={`v${h}`} x1={x(h / 24)} x2={x(h / 24)} y1={TOP} y2={TOP + ROW_H * 4} className={h % 6 === 0 ? 'eld-tick major' : 'eld-tick'} />
      ))}
      {nowFrac > 0 && nowFrac < 1 && (
        <line x1={x(nowFrac)} x2={x(nowFrac)} y1={TOP - 4} y2={TOP + ROW_H * 4} className="eld-now" />
      )}
      <path d={paths.planned} className="eld-line planned" />
      <path d={paths.recorded} className="eld-line" />
    </svg>
  )
}
