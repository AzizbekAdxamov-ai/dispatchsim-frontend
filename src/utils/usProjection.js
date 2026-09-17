// The tracking map's geometry math: a Mercator projection plus the
// great-circle sampler for lane lines. No map data lives here -- state and
// nation boundaries come from src/data/usMap.js, a generated file built by
// scripts/build-us-map.mjs from the us-atlas package. That build script
// imports makeProject() from this file (not a copy of it), so the boundary
// paths baked into usMap.js and the truck markers this module positions at
// runtime always agree on where a coordinate lands -- there is only ever
// one projection function.
//
// Why not a tile library: the board is a fleet-at-a-glance visual, not a
// navigator. A real map brings tiles, attribution, an API key and a second
// visual language into the panel; an SVG projection keeps it tokens-only and
// theme-aware (dark + cream), and the data on it is ours -- cities.js's
// hand-checked coordinates, the same ones position.js places markers with.

export const VIEW_W = 740
export const VIEW_H = 400
const PAD = 16

// Web-Mercator y (deg-equivalent units, so x and y share one scale).
// Equirectangular would squash the recognizable northern width of the
// country; Mercator keeps the shape a US reader expects.
export function mercY(latDeg) {
  const r = (latDeg * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2)) * (180 / Math.PI)
}

// Builds a lat/lon -> SVG user-space projector for a given geographic
// bounds box. `bounds` is { minLon, maxLon, minY, maxY }, where minY/maxY
// are already-projected Mercator y values (see mercY above), not raw
// latitudes -- the caller computes those once from whatever geometry it is
// fitting the view to.
//
// Every layer of the map (boundaries, lanes, endpoints, markers) is
// projected with the same makeProject(PROJECTION_BOUNDS) instance, so
// nothing on the map can disagree about where a coordinate is.
export function makeProject(bounds) {
  const { minLon, maxLon, minY, maxY } = bounds
  const scale = Math.min(
    (VIEW_W - PAD * 2) / (maxLon - minLon),
    (VIEW_H - PAD * 2) / (maxY - minY),
  )
  const offX = (VIEW_W - (maxLon - minLon) * scale) / 2
  const offY = (VIEW_H - (maxY - minY) * scale) / 2

  return function project(lat, lon) {
    return {
      x: offX + (lon - minLon) * scale,
      y: offY + (maxY - mercY(lat)) * scale,
    }
  }
}

export const TRACKING_VIEWBOX = `0 0 ${VIEW_W} ${VIEW_H}`

// Great-circle interpolation (slerp over the unit sphere) -- the same math
// position.js uses server-side to place the marker. The lane line is drawn
// by sampling this arc, so the line a lane is drawn on and the dot that
// travels it are built from the same formula and can never diverge.
function interpolateGreatCircle(a, b, f) {
  const toRad = Math.PI / 180
  const toDeg = 180 / Math.PI

  const lat1 = a.lat * toRad
  const lon1 = a.lon * toRad
  const lat2 = b.lat * toRad
  const lon2 = b.lon * toRad

  const cosD = Math.sin(lat1) * Math.sin(lat2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  const d = Math.acos(Math.min(1, Math.max(-1, cosD)))

  if (d < 1e-9 || Math.abs(d - Math.PI) < 1e-9) return { lat: a.lat, lon: a.lon }

  const sinD = Math.sin(d)
  const wA = Math.sin((1 - f) * d) / sinD
  const wB = Math.sin(f * d) / sinD

  const x = wA * Math.cos(lat1) * Math.cos(lon1) + wB * Math.cos(lat2) * Math.cos(lon2)
  const y = wA * Math.cos(lat1) * Math.sin(lon1) + wB * Math.cos(lat2) * Math.sin(lon2)
  const z = wA * Math.sin(lat1) + wB * Math.sin(lat2)

  return {
    lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg,
    lon: Math.atan2(y, x) * toDeg,
  }
}

// Great-circle arc, sampled into plain [lon, lat] points -- shared by
// lanePathD below (SVG path string, for TrackingMap.jsx) and FleetMap.jsx
// (GeoJSON LineString coordinates, for the vector map). One sampling
// routine used by both so the arc a lane is drawn on can never diverge
// between the two map implementations. 32 samples is far past the point
// where the eye can see segmenting on a lane of at most ~2,800 mi.
export function greatCirclePoints(origin, destination, steps = 32) {
  if (!origin || !destination) return []
  const points = []
  for (let i = 0; i <= steps; i += 1) {
    const p = interpolateGreatCircle(origin, destination, i / steps)
    points.push([p.lon, p.lat])
  }
  return points
}

// SVG path string for a lane: greatCirclePoints() run through the SVG
// projector. `project` is passed in (rather than imported) so callers
// always use the one projector built from PROJECTION_BOUNDS.
export function lanePathD(project, origin, destination) {
  const points = greatCirclePoints(origin, destination, 32)
  if (points.length === 0) return ''
  return points
    .map(([lon, lat], i) => {
      const p = project(lat, lon)
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    })
    .join(' ')
}
