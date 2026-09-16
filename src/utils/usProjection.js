// The tracking map's geometry: a Mercator projection over a hand-simplified
// continental-US outline, plus the great-circle sampler for lane lines.
//
// Why not a tile library: the board is a fleet-at-a-glance visual, not a
// navigator. A real map brings tiles, attribution, an API key and a second
// visual language into the panel; an SVG projection keeps it tokens-only and
// theme-aware (dark + cream), and the data on it is ours -- cities.js's
// hand-checked coordinates, the same ones position.js places markers with.
//
// The outline is deliberately simplified (~120 points): at dashboard size the
// test is "reads instantly as the US", not "matches the coastline". Lakes
// Michigan/Huron/Superior/Erie/Ontario read correctly because the outline
// traces their south/west shores, which cuts them out as water; Lake
// Michigan is interior, so it gets its own water shape on top.
//
// Coordinates are [lat, lon] pairs, approximate public reference values.

const US_OUTLINE = [
  // Pacific coast, north to south
  [48.38, -124.73], [47.9, -124.65], [47.0, -124.15], [46.25, -123.95],
  [45.5, -124.0], [44.62, -124.05], [43.7, -124.35], [42.8, -124.55],
  [41.75, -124.25], [40.44, -124.4], [39.75, -123.8], [38.95, -123.75],
  [38.3, -123.1], [37.8, -122.5], [37.45, -122.4], [36.95, -122.05],
  [36.55, -121.9], [35.9, -121.55], [35.15, -120.65], [34.55, -120.6],
  [34.05, -119.2], [33.9, -118.4], [33.72, -118.2], [32.9, -117.45],
  [32.53, -117.12],
  // Mexico border
  [32.53, -114.72], [31.33, -111.07], [31.33, -109.05], [31.78, -108.21],
  [31.33, -108.21], [31.78, -106.53],
  // Rio Grande down to the Texas tip
  [30.6, -104.9], [29.7, -104.45], [29.55, -102.9], [29.0, -101.9],
  [28.0, -100.6], [26.9, -99.7], [26.06, -98.15], [25.95, -97.15],
  // Gulf coast, west to east
  [26.07, -97.4], [27.0, -97.35], [27.85, -97.1], [28.5, -96.4],
  [29.0, -95.4], [29.35, -94.75], [29.6, -93.9], [29.55, -92.9],
  [29.9, -92.3], [29.95, -91.2], [30.25, -90.1], [30.4, -89.0],
  [30.35, -88.0], [30.4, -87.3], [30.4, -86.5], [30.35, -85.7],
  [29.95, -85.0], [29.7, -84.35], [29.15, -84.0], [28.9, -82.9],
  [28.4, -82.8], [27.9, -82.8], [27.5, -82.6], [26.9, -82.3],
  [26.4, -81.9], [25.9, -81.7], [25.2, -81.2], [25.15, -80.4],
  // Atlantic coast, south to north
  [26.4, -80.1], [26.9, -80.05], [27.85, -80.3], [28.9, -80.65],
  [29.7, -81.2], [30.35, -81.4], [31.1, -81.4], [31.9, -81.1],
  [32.4, -80.75], [33.4, -79.0], [34.6, -77.05], [35.26, -75.55],
  [36.0, -75.7], [36.55, -76.0], [36.9, -75.98], [37.5, -75.8],
  [38.3, -75.05], [39.0, -74.6], [39.5, -74.25], [40.2, -74.0],
  [40.55, -73.9], [41.0, -72.7], [41.3, -71.9], [41.55, -71.0],
  [41.8, -70.1], [42.5, -70.8], [43.1, -70.75], [43.7, -70.1],
  [44.2, -69.0], [44.5, -68.0], [44.8, -67.1], [45.2, -67.1],
  // Canadian border: Maritimes, Quebec, upstate New York
  [46.1, -67.8], [46.7, -68.0], [47.45, -69.2], [47.2, -70.2],
  [46.9, -71.05], [45.5, -71.4], [45.0, -72.6], [45.0, -74.7],
  [45.05, -76.8],
  // Great Lakes shores: Ontario, Erie, the Michigan mitten, Superior
  [43.65, -76.9], [43.4, -77.6], [43.15, -78.7], [42.95, -79.05],
  [42.6, -79.7], [42.2, -80.4], [41.85, -80.9], [41.65, -81.6],
  [41.55, -82.3], [41.75, -83.4], [42.7, -82.7], [43.3, -82.35],
  [44.05, -82.45], [44.7, -83.15], [45.3, -83.45], [45.85, -84.65],
  [46.4, -84.75], [46.8, -85.3], [46.75, -86.3], [46.45, -87.1],
  [46.6, -88.0], [46.8, -88.6], [46.6, -89.3], [46.65, -90.3],
  [46.75, -91.3], [46.75, -92.1],
  // Across Lake Superior, then the 49th parallel home
  [47.6, -91.0], [48.2, -89.8], [48.6, -89.0], [48.5, -90.5],
  [48.9, -92.0], [49.3, -94.6], [49.38, -95.15], [48.99, -96.5],
  [48.99, -100.0], [48.99, -104.05], [49.0, -107.05], [49.0, -111.05],
  [49.0, -117.0], [49.0, -123.0],
]

// Interior water: Lake Michigan is enclosed by land on both sides, so the
// outline alone cannot show it. A simple cigar shape reads at this size.
const LAKE_MICHIGAN = [
  [45.85, -87.1], [45.2, -86.85], [44.3, -86.8], [43.6, -86.35],
  [43.0, -86.35], [42.55, -86.25], [42.15, -86.5], [42.25, -87.15],
  [42.9, -87.55], [43.6, -87.75], [44.3, -87.6], [45.1, -87.5],
  [45.7, -87.35],
]

export const VIEW_W = 740
export const VIEW_H = 400
const PAD = 16

// Web-Mercator y (deg-equivalent units, so x and y share one scale).
// Equirectangular would squash the recognizable northern width of the
// country; Mercator keeps the shape a US reader expects.
function mercY(latDeg) {
  const r = (latDeg * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2)) * (180 / Math.PI)
}

const LATS = US_OUTLINE.map((p) => p[0])
const LONS = US_OUTLINE.map((p) => p[1])
const MIN_LON = Math.min(...LONS)
const MAX_LON = Math.max(...LONS)
const MIN_Y = mercY(Math.min(...LATS))
const MAX_Y = mercY(Math.max(...LATS))

const SCALE = Math.min(
  (VIEW_W - PAD * 2) / (MAX_LON - MIN_LON),
  (VIEW_H - PAD * 2) / (MAX_Y - MIN_Y),
)
const OFF_X = (VIEW_W - (MAX_LON - MIN_LON) * SCALE) / 2
const OFF_Y = (VIEW_H - (MAX_Y - MIN_Y) * SCALE) / 2

// lat/lon -> SVG user-space coordinates. Every layer of the map (outline,
// lanes, endpoints, markers) goes through this one function, so nothing on
// the map can disagree about where a coordinate is.
export function project(lat, lon) {
  return {
    x: OFF_X + (lon - MIN_LON) * SCALE,
    y: OFF_Y + (MAX_Y - mercY(lat)) * SCALE,
  }
}

function toPath(points, close) {
  const parts = points.map(([lat, lon], i) => {
    const p = project(lat, lon)
    return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  })
  return parts.join(' ') + (close ? ' Z' : '')
}

export const US_OUTLINE_PATH = toPath(US_OUTLINE, true)
export const LAKE_MICHIGAN_PATH = toPath(LAKE_MICHIGAN, true)
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

// SVG path string for a lane: the great-circle arc, sampled and projected.
// 32 samples is far past the point where the eye can see segmenting on a
// lane of at most ~2,800 mi.
export function lanePathD(origin, destination) {
  if (!origin || !destination) return ''
  const STEPS = 32
  const points = []
  for (let i = 0; i <= STEPS; i += 1) {
    points.push(project(
      interpolateGreatCircle(origin, destination, i / STEPS).lat,
      interpolateGreatCircle(origin, destination, i / STEPS).lon,
    ))
  }
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}
