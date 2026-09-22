// The basemap every map page shares: style URLs, the pannable box, the
// starting frame, and the theme-token colors for drawn layers. Moved out
// of FleetMap.jsx unchanged so the fleet map and the route planner can
// never disagree about where North America is.
import { PROJECTION_BOUNDS } from '../../data/usMap'

// OpenFreeMap's hosted styles (free, no API key). Picked per theme so the
// basemap's own ink matches the app's dark/cream split rather than fighting
// it -- 'positron' is OpenFreeMap's light/muted style, 'dark' its dark one.
export const STYLE_URL = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

// PROJECTION_BOUNDS.minY/maxY (from usMap.js, generated from us-atlas's
// real Census geometry) are Mercator-projected y values in mercY()'s
// pseudo-degree units, not raw latitude -- see usProjection.js's own
// comment on mercY. Inverting that same formula here recovers the actual
// latitude bounds of the exact geometry the SVG map was built from, so the
// vector map's bounding box is not a second, hand-typed guess at where the
// continental US sits.
function invMercY(y) {
  const rad = 2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2
  return (rad * 180) / Math.PI
}

const US_LAT_MIN = invMercY(PROJECTION_BOUNDS.minY)
const US_LAT_MAX = invMercY(PROJECTION_BOUNDS.maxY)

// How far the user may pan: the three countries a US carrier actually
// runs in, and nothing else.
//
// The continental US alone was too tight -- a Laredo or Detroit lane sits
// right on the border and the map clipped the other side of it. The whole
// world was too loose: pan far enough and the fleet is a speck off the
// coast of Africa. So the box is the union of the three countries' own
// bounding boxes, each written down with where it came from rather than
// eyeballed off a map.
//
// Country boxes are the standard published extents (Natural Earth /
// ISO 3166 country bounds, checked 2026-09-17):
//   Canada   lon -141.00 .. -52.62,  lat 41.68 .. 83.11
//   Mexico   lon -118.45 .. -86.71,  lat 14.53 .. 32.72
//   US (48)  from PROJECTION_BOUNDS -- the Census geometry this app
//            already draws, so the US edge can never disagree with the
//            cities plotted on it.
//
// Two deliberate trims:
//  - North is cut at 72 rather than Canada's true 83.11. Above that line
//    is uninhabited Arctic island; including it would mean the default
//    "fit everything" zoom spends half the panel on empty ice.
//  - Alaska is left out on purpose. Its west end crosses the antimeridian
//    (-179), which would stretch the box across most of the northern
//    hemisphere -- the same trap that flattened the SVG map when the
//    us-atlas nation geometry was used unfiltered. No seed city is in
//    Alaska, so nothing is lost.
const COUNTRY_BOUNDS = {
  canada: { minLon: -141.0, maxLon: -52.62, minLat: 41.68, maxLat: 83.11 },
  mexico: { minLon: -118.45, maxLon: -86.71, minLat: 14.53, maxLat: 32.72 },
  us: {
    minLon: PROJECTION_BOUNDS.minLon,
    maxLon: PROJECTION_BOUNDS.maxLon,
    minLat: US_LAT_MIN,
    maxLat: US_LAT_MAX,
  },
}

const ARCTIC_CUTOFF_LAT = 72

const boxes = Object.values(COUNTRY_BOUNDS)

// The pannable box: the union of the three, Arctic-trimmed. No padding is
// added -- unlike the US-only box this one already reaches open ocean on
// three sides, so there is nothing a margin would reveal.
export const NORTH_AMERICA_BOUNDS = [
  [Math.min(...boxes.map((b) => b.minLon)), Math.min(...boxes.map((b) => b.minLat))],
  [Math.max(...boxes.map((b) => b.maxLon)), Math.min(ARCTIC_CUTOFF_LAT, Math.max(...boxes.map((b) => b.maxLat)))],
]

// Where the camera sits when the page opens and what `minZoom` is measured
// against: the fleet is in the US, so that is what gets framed. Panning out
// to Canada or Mexico stays possible, it is just not the starting view.
export const US_BOUNDS = [
  [PROJECTION_BOUNDS.minLon - 2, US_LAT_MIN - 2],
  [PROJECTION_BOUNDS.maxLon + 2, US_LAT_MAX + 2],
]

// Our own drawn layers (cities/lanes/fleet dots) must still obey the
// project's no-hardcoded-color rule, but MapLibre's `paint` properties take
// plain JS values, not CSS -- there is no `var(--...)` inside a style
// expression. Reading the resolved custom property off the root element is
// the one way to keep these colors token-driven instead of hardcoded, and
// this is re-read on every theme flip (see the MutationObserver below) so
// the layers stay in sync with dark/cream. The basemap's own colors come
// from the OpenFreeMap style JSON and are exempt from this rule, same as
// any other map tile provider's cartography.
export function readColors() {
  const style = getComputedStyle(document.documentElement)
  const get = (name) => style.getPropertyValue(name).trim()
  return {
    blue: get('--blue'),
    amber: get('--amber'),
    green: get('--green'),
    red: get('--red'),
    muted: get('--text-3'),
    panel: get('--panel'),
    text2: get('--text-2'),
  }
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

