import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import '../fleet/FleetWidgets.css'
import './DsoGauge.css'

gsap.registerPlugin(useGSAP)

const SIZE = 180
const STROKE = 14
const CX = SIZE / 2
const CY = SIZE / 2 + 6
const R = CX - STROKE

// Exact arc length of a semicircle — used as the stroke-dasharray so the
// fill can be revealed with a plain strokeDashoffset animation, the same
// technique TireRing uses for its full-circle rings.
const ARC_LENGTH = Math.PI * R

// t: 0 → left end of the gauge (value 0), 1 → right end (value = max),
// sweeping clockwise over the top — a standard half-circle speedometer.
function pointAt(t, radius) {
  const phi = Math.PI * (1 - t)
  return { x: CX + radius * Math.cos(phi), y: CY - radius * Math.sin(phi) }
}

const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

function gaugeColor(value) {
  if (value <= 30) return 'var(--green)'
  if (value <= 45) return 'var(--amber)'
  return 'var(--red)'
}

export default function DsoGauge({
  value,
  target = 30,
  title = 'Days to payment',
  sub = 'Average vs Net 30 target',
  max = 90,
}) {
  const scopeRef = useRef(null)
  const pct = Math.max(0, Math.min(1, value / max))
  const targetPct = Math.max(0, Math.min(1, target / max))
  const targetInner = pointAt(targetPct, R - STROKE / 2 - 4)
  const targetOuter = pointAt(targetPct, R + STROKE / 2 + 4)
  const color = gaugeColor(value)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.dso-arc-fg',
        { strokeDashoffset: ARC_LENGTH },
        { strokeDashoffset: ARC_LENGTH * (1 - pct), duration: 1.1, ease: 'power2.out', delay: 0.1 },
      )
    })
  }, { scope: scopeRef, dependencies: [pct] })

  return (
    <div className="widget dso-widget" ref={scopeRef}>
      <div className="widget-title">{title}</div>
      <div className="widget-sub">{sub}</div>
      <div className="dso-gauge" role="img" aria-label={value + ' days average, target ' + target + ' days'}>
        <svg width={SIZE} height={SIZE / 2 + 24} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 24}`}>
          <path className="dso-arc-bg" d={ARC_PATH} strokeWidth={STROKE} />
          <path
            className="dso-arc-fg"
            d={ARC_PATH}
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH * (1 - pct)}
          />
          <line
            className="dso-target-tick"
            x1={targetInner.x}
            y1={targetInner.y}
            x2={targetOuter.x}
            y2={targetOuter.y}
          />
        </svg>
        <div className="dso-center">
          <div className="dso-value mono" style={{ color }}>{value}</div>
          <div className="dso-unit">days</div>
        </div>
      </div>
      <div className="dso-caption">
        Target: <b>Net {target}</b>
      </div>
    </div>
  )
}
