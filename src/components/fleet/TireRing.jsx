import { useEffect, useState } from 'react'
import './TireRing.css'

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ringColor(pct) {
  if (pct < 40) return 'var(--red)'
  if (pct < 65) return 'var(--amber)'
  return 'var(--green)'
}

export function TireRingItem({ pct, label }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const offset = CIRCUMFERENCE - (animated ? (pct / 100) * CIRCUMFERENCE : 0)

  return (
    <div className="tire-item">
      <div className="tire-ring" role="img" aria-label={label + ' tire tread: ' + pct + '%'}>
        <svg width="70" height="70">
          <circle className="tire-bg" cx="35" cy="35" r={RADIUS} />
          <circle
            className="tire-fg"
            cx="35"
            cy="35"
            r={RADIUS}
            stroke={ringColor(pct)}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="tire-pct">{pct}%</div>
      </div>
      <div className="tire-lbl">{label}</div>
    </div>
  )
}

export default function TireRing({ front, rear }) {
  return (
    <div className="widget">
      <div className="widget-title">Tire tread</div>
      <div className="widget-sub">Front / rear average</div>
      <div className="tire-row">
        <TireRingItem pct={front} label="Front" />
        <TireRingItem pct={rear} label="Rear" />
      </div>
    </div>
  )
}
