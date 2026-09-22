// The four ELD duty statuses (49 CFR 395.8), in the order a record of duty
// status grid lists them top to bottom. `short` is the grid's row label.
export const DUTY_STATUSES = [
  { key: 'off-duty', label: 'Off Duty', short: 'OFF', badge: 'neutral' },
  { key: 'sleeper-berth', label: 'Sleeper Berth', short: 'SB', badge: 'neutral' },
  { key: 'driving', label: 'Driving', short: 'D', badge: 'ontime' },
  { key: 'on-duty-not-driving', label: 'On Duty', short: 'ON', badge: 'done' },
]

export const DUTY_STATUS_BY_KEY = Object.fromEntries(DUTY_STATUSES.map((s) => [s.key, s]))

export function dutyStatusLabel(key) {
  return DUTY_STATUS_BY_KEY[key]?.label ?? '—'
}

// HOS minutes -> 'h:mm', the way HOS clocks are read ('7:45').
export function formatClock(min) {
  if (min == null || Number.isNaN(min)) return '—'
  const abs = Math.max(0, Math.round(min))
  return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}
