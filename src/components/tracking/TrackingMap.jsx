// The map layer: one SVG, the continental US (with real state borders),
// every in-transit lane drawn on it, and the marker for the selected load
// pulsing at its position.
//
// Framer Motion handles the marker animation (position transitions, the
// pulse ring) -- this is simple state animation, exactly the division of
// labor the project's animation rule asks for. GSAP is for gauges and
// timelines; a dot that eases between two points is not that.
//
// Hard rule respected: every color comes from CSS variables, so the map
// recolors itself when the theme flips dark <-> cream.
//
// NATION_PATH and STATE_PATHS are generated (src/data/usMap.js, built by
// scripts/build-us-map.mjs from us-atlas) -- do not hand-edit that data.
// `project` here is built from that same file's PROJECTION_BOUNDS via
// makeProject(), the one projector the build script also used, so the
// boundaries and every truck/lane on top of them are always in agreement.

import { motion } from 'framer-motion'
import { TRACKING_VIEWBOX, makeProject, lanePathD } from '../../utils/usProjection'
import { PROJECTION_BOUNDS, NATION_PATH, STATE_PATHS } from '../../data/usMap'

const project = makeProject(PROJECTION_BOUNDS)

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

export default function TrackingMap({ loads, cities = [], selected, onSelect }) {
  const selectedLoad = loads.find((l) => l.id === selected) ?? null

  return (
    <svg
      className="tracking-map-svg"
      viewBox={TRACKING_VIEWBOX}
      role="img"
      aria-label="Map of in-transit loads across the continental United States"
    >
      {/* land fill first (nation silhouette), state borders on top of
          it, lanes and markers on top of those. Census boundaries already
          cut out the Great Lakes as background, so no separate lake shape
          is needed the way the hand-drawn outline required. */}
      <path className="tracking-us-land" d={NATION_PATH} />
      {STATE_PATHS.map((s) => (
        <path key={s.id} className="tracking-us-state" d={s.d}>
          <title>{s.name}</title>
        </path>
      ))}

      {/* Standing city layer: the seed's closed set of freight hubs, drawn
          whether or not anything is moving. The map is this page's subject,
          not a backdrop that materialises with the first load -- and the
          dots give every lane two endpoints the reader can recognise before
          a truck is anywhere near them. Below the lanes on purpose: they are
          ground, and the fleet is what sits on top of it. */}
      {cities.map((c) => {
        const p = project(c.lat, c.lon)
        return (
          <circle key={`${c.city}, ${c.state}`} cx={p.x} cy={p.y} r={1.6} className="tracking-city-dot">
            <title>{`${c.city}, ${c.state}`}</title>
          </circle>
        )
      })}

      {/* every lane at low emphasis; the selected one draws on top */}
      {loads.map((load) => {
        const d = lanePathD(project, load.originPos, load.destinationPos)
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
