// The map layer: one SVG, the continental US, every in-transit lane drawn
// on it, and the marker for the selected load pulsing at its position.
//
// Framer Motion handles the marker animation (position transitions, the
// pulse ring) -- this is simple state animation, exactly the division of
// labor the project's animation rule asks for. GSAP is for gauges and
// timelines; a dot that eases between two points is not that.
//
// Hard rule respected: every color comes from CSS variables, so the map
// recolors itself when the theme flips dark <-> cream.

import { motion } from 'framer-motion'
import {
  TRACKING_VIEWBOX, US_OUTLINE_PATH, LAKE_MICHIGAN_PATH, project, lanePathD,
} from '../../utils/usProjection'

// Marker radius in SVG units -- fixed because the viewBox scales it.
const MARKER_R = 5.5

function pulsingMarker({ x, y, late }) {
  const color = late ? 'var(--red)' : 'var(--blue)'
  return (
    <g>
      {/* pulse ring: grows and fades on a loop, sized from the marker's edge */}
      <motion.circle
        cx={x}
        cy={y}
        r={MARKER_R}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        animate={{ scale: [1, 2.6], opacity: [0.55, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
      {/* marker dot: eases between positions when selection/poll moves it */}
      <motion.circle
        cx={x}
        cy={y}
        r={MARKER_R}
        fill={color}
        stroke="var(--panel)"
        strokeWidth={2}
        initial={false}
        animate={{ cx: x, cy: y }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {/* heading: the truck is aimed down the lane, not parked -- a trailing
          shadow dot reads as direction without an arrow icon */}
      <motion.circle
        r={2}
        fill={color}
        opacity={0.45}
        initial={false}
        animate={{ cx: x, cy: y }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
      />
    </g>
  )
}

export default function TrackingMap({ loads, selected, onSelect }) {
  const selectedLoad = loads.find((l) => l.id === selected) ?? null

  return (
    <svg
      className="tracking-map-svg"
      viewBox={TRACKING_VIEWBOX}
      role="img"
      aria-label="Map of in-transit loads across the continental United States"
    >
      {/* land + water first, lanes and markers on top */}
      <path className="tracking-us-land" d={US_OUTLINE_PATH} />
      <path className="tracking-us-lake" d={LAKE_MICHIGAN_PATH} />

      {/* every lane at low emphasis; the selected one draws on top */}
      {loads.map((load) => {
        const d = lanePathD(load.originPos, load.destinationPos)
        if (!d) return null
        const isSelected = load.id === selected
        return (
          <g key={load.id} className="tracking-lane-group" onClick={() => onSelect?.(load.id)}>
            <path
              className={'tracking-lane' + (isSelected ? ' selected' : '') + (load.late ? ' late' : '')}
              d={d}
            />
          </g>
        )
      })}

      {/* endpoints of the selected lane only -- at fleet scale every
          endpoint dot would be noise; selection is what has detail */}
      {selectedLoad && selectedLoad.originPos && selectedLoad.destinationPos && (
        <>
          <circle
            cx={project(selectedLoad.originPos.lat, selectedLoad.originPos.lon).x}
            cy={project(selectedLoad.originPos.lat, selectedLoad.originPos.lon).y}
            r={4}
            className="tracking-endpoint"
          />
          <circle
            cx={project(selectedLoad.destinationPos.lat, selectedLoad.destinationPos.lon).x}
            cy={project(selectedLoad.destinationPos.lat, selectedLoad.destinationPos.lon).y}
            r={4}
            className="tracking-endpoint"
          />
        </>
      )}

      {/* background fleet dots: unselected trucks at their positions */}
      {loads.filter((l) => l.id !== selected).map((load) => {
        const p = project(load.lat, load.lon)
        return (
          <circle
            key={load.id}
            cx={p.x}
            cy={p.y}
            r={3}
            className={'tracking-fleet-dot' + (load.late ? ' late' : '')}
            onClick={() => onSelect?.(load.id)}
          />
        )
      })}

      {/* the selected load's marker, last so it sits on top of everything */}
      {selectedLoad && (
        pulsingMarker({
          x: project(selectedLoad.lat, selectedLoad.lon).x,
          y: project(selectedLoad.lat, selectedLoad.lon).y,
          late: selectedLoad.late,
        })
      )}
    </svg>
  )
}
