// Pure helpers for the duty-status grid (EldLogGrid.jsx) and its totals.
// Times are compressed-calendar ms; positions are fractions of one
// simulated day; totals are HOS minutes.
import { DUTY_STATUSES } from './dutyStatus'

// Each event clipped to [dayStart, dayEnd), split at `now`: the part
// before it is recorded, the part after it is the plan for the rest of
// the run.
export function segmentsForDay(events, dayStartMs, dayEndMs, nowMs) {
  const span = dayEndMs - dayStartMs
  const out = []
  for (const e of events) {
    const s = Math.max(new Date(e.startedAt).getTime(), dayStartMs)
    const en = Math.min(new Date(e.endedAt).getTime(), dayEndMs)
    if (!(en > s)) continue
    // Split at now: before it is recorded, after it is planned.
    if (s < nowMs && en > nowMs) {
      out.push({ status: e.status, from: (s - dayStartMs) / span, to: (nowMs - dayStartMs) / span, planned: false })
      out.push({ status: e.status, from: (nowMs - dayStartMs) / span, to: (en - dayStartMs) / span, planned: true })
    } else {
      out.push({ status: e.status, from: (s - dayStartMs) / span, to: (en - dayStartMs) / span, planned: s >= nowMs })
    }
  }
  out.sort((a, b) => a.from - b.from)

  // An ELD has no holes: time with no recorded status, up to now, is Off
  // Duty -- the same reading the backend's hosClock.js withOffDutyGaps
  // makes, so the grid and the clocks never disagree about a gap.
  const nowFrac = Math.min(1, Math.max(0, (nowMs - dayStartMs) / span))
  const filled = []
  let cursor = 0
  for (const seg of out) {
    if (seg.from > cursor + 1e-9 && cursor < nowFrac) {
      filled.push({ status: 'off-duty', from: cursor, to: Math.min(seg.from, nowFrac), planned: false, gap: true })
    }
    filled.push(seg)
    cursor = Math.max(cursor, seg.to)
  }
  if (cursor < nowFrac - 1e-9) filled.push({ status: 'off-duty', from: cursor, to: nowFrac, planned: false, gap: true })
  return filled.sort((a, b) => a.from - b.from)
}

// Recorded HOS minutes per status inside the day (planned time excluded).
export function totalsForDay(segments) {
  const totals = Object.fromEntries(DUTY_STATUSES.map((s) => [s.key, 0]))
  for (const seg of segments) {
    if (!seg.planned && seg.status in totals) totals[seg.status] += (seg.to - seg.from) * 24 * 60
  }
  return totals
}
