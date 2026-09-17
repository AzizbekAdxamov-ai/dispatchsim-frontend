#!/usr/bin/env node
// Generates src/data/usMap.js from us-atlas's states-10m TopoJSON.
//
// Why generate rather than hand-trace: the previous US_OUTLINE was ~120
// hand-picked points and had no state borders at all. us-atlas ships actual
// Census Bureau cartographic boundaries (public domain / ISC), so this
// script turns those into flat SVG path data once, at build time, instead
// of shipping a topology parser to the browser.
//
// Critical constraint: the nation/state paths baked into usMap.js and the
// truck markers TrackingMap.jsx positions at runtime MUST come out of the
// exact same projection math, or the boundaries and the fleet will drift
// apart pixel by pixel with nobody noticing until a truck marker floats
// off the coastline. So this script imports makeProject() and mercY() from
// ../src/utils/usProjection.js -- the same module the runtime component
// uses -- rather than re-implementing the formula here.
//
// Scope: continental US (lower 48 + DC) only -- the same footprint the
// hand-drawn outline it replaces had, and the same one cities.js seeds
// freight through. Two independent reasons to filter states-10m down to
// that set rather than draw all of it: (1) Alaska's Aleutian chain crosses
// the antimeridian, so its raw longitudes (~+170..+180) sit on the far
// side of the globe from the rest of the country in this data -- included,
// they blow the projection's bounding box out to nearly the full -180..180
// range and squash the real US into a sliver; (2) nothing in this app
// (loads, drivers, cities) ever routes through AK, HI or the territories,
// so drawing them would just be unused ink.
//
// Usage:
//   node scripts/build-us-map.mjs          regenerate src/data/usMap.js
//   node scripts/build-us-map.mjs --check   regenerate in memory and diff
//                                            against the committed file;
//                                            exit 1 on any difference

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { feature, merge } from 'topojson-client'
import { makeProject, mercY } from '../src/utils/usProjection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ATLAS_PATH = path.join(ROOT, 'node_modules/us-atlas/states-10m.json')
const OUT_PATH = path.join(ROOT, 'src/data/usMap.js')

// Simplification tolerance, in SVG user-space units (the map is drawn in a
// 740x400 viewBox). A point is dropped when it sits closer than this to the
// running last-kept point on the same ring. 0.35 units on a 740px-wide map
// is under half a screen pixel at typical panel render sizes -- invisible
// to the eye -- while cutting the enormous point count TopoJSON's raw
// arcs carry (drawn from 1:10,000,000-ish source detail meant for much
// bigger renders than a dashboard tile). This is the value that gets the
// generated file comfortably under the 250 KB budget without visibly
// coarsening the coastline or state lines at this map's size.
const SIMPLIFY_TOLERANCE = 0.35

// Coordinates are rounded to 1 decimal place in the emitted path strings.
// The viewBox is 740x400 user units, so one decimal is already finer than a
// screen pixel at any panel size this map renders at -- extra digits would
// only inflate the file.
const COORD_DECIMALS = 1

function distSq(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

// Projects one ring of [lon, lat] pairs (GeoJSON order) to SVG points,
// dropping points that fall within SIMPLIFY_TOLERANCE of the last kept
// point, then rounds and joins them into an SVG path `d` string.
function ringToPath(project, ring, tolerance) {
  const kept = []
  for (const [lon, lat] of ring) {
    const p = project(lat, lon)
    const pt = [p.x, p.y]
    if (kept.length === 0 || distSq(kept[kept.length - 1], pt) >= tolerance * tolerance) {
      kept.push(pt)
    }
  }
  // A ring collapsed by simplification to under 3 points draws nothing
  // useful (a line or a dot) -- skip it rather than emit a degenerate path.
  if (kept.length < 3) return ''
  const round = (n) => Number(n.toFixed(COORD_DECIMALS))
  return kept
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join(' ') + ' Z'
}

// A GeoJSON geometry (Polygon or MultiPolygon) becomes one SVG path `d`
// string covering all of its rings, using the SVG nonzero/evenodd fill
// rule to keep holes (e.g. a state boundary cut by a lake) working exactly
// like the TopoJSON source intends.
function geometryToPath(project, geometry, tolerance) {
  if (!geometry) return ''
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const parts = []
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const d = ringToPath(project, ring, tolerance)
      if (d) parts.push(d)
    }
  }
  return parts.join(' ')
}

// FIPS state codes excluded from the map: Alaska, Hawaii, and the
// territories (Puerto Rico, Guam, American Samoa, the Northern Mariana
// Islands, the US Virgin Islands). See the header comment for why.
const EXCLUDED_FIPS = new Set(['02', '15', '60', '66', '69', '72', '78'])

function build() {
  const topology = JSON.parse(readFileSync(ATLAS_PATH, 'utf8'))

  const allStateGeometries = topology.objects.states.geometries
  const continentalGeometries = allStateGeometries.filter((g) => !EXCLUDED_FIPS.has(g.id))

  // merge() (not feature()) dissolves the shared borders between the
  // selected states into one outer-boundary MultiPolygon -- exactly the
  // "nation, continental-US-only" shape this map needs, computed from the
  // same source geometry as the state paths rather than hand-traced.
  const nationGeometry = merge(topology, continentalGeometries)
  const continentalStatesFC = feature(
    topology,
    { type: 'GeometryCollection', geometries: continentalGeometries },
  )

  // Bounds come from the (already continental-only) nation geometry itself
  // -- not a hand-picked box -- so the view always fits whatever us-atlas
  // ships for the lower 48 + DC, including any future version bump.
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  const nationPolygons = nationGeometry.type === 'Polygon'
    ? [nationGeometry.coordinates]
    : nationGeometry.coordinates
  for (const polygon of nationPolygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  const minY = mercY(minLat)
  const maxY = mercY(maxLat)
  const bounds = { minLon, maxLon, minY, maxY }
  const project = makeProject(bounds)

  const nationPath = geometryToPath(project, nationGeometry, SIMPLIFY_TOLERANCE)

  const statePaths = continentalStatesFC.features
    .map((f) => ({
      id: f.id,
      name: f.properties?.name ?? String(f.id),
      d: geometryToPath(project, f.geometry, SIMPLIFY_TOLERANCE),
    }))
    .filter((s) => s.d)
    .sort((a, b) => a.name.localeCompare(b.name))

  const roundBound = (n) => Number(n.toFixed(4))
  const boundsOut = {
    minLon: roundBound(minLon),
    maxLon: roundBound(maxLon),
    minY: roundBound(minY),
    maxY: roundBound(maxY),
  }

  const lines = []
  lines.push('// GENERATED FILE -- do not edit by hand.')
  lines.push('// Run `npm run build:map` to regenerate. Source: us-atlas states-10m')
  lines.push('// (US Census Bureau cartographic boundaries, ISC).')
  lines.push('')
  lines.push(`export const PROJECTION_BOUNDS = ${JSON.stringify(boundsOut)}`)
  lines.push('')
  lines.push(`export const NATION_PATH = ${JSON.stringify(nationPath)}`)
  lines.push('')
  lines.push('export const STATE_PATHS = [')
  for (const s of statePaths) {
    lines.push(`  { id: ${JSON.stringify(s.id)}, name: ${JSON.stringify(s.name)}, d: ${JSON.stringify(s.d)} },`)
  }
  lines.push(']')
  lines.push('')

  return lines.join('\n')
}

function main() {
  const checkMode = process.argv.includes('--check')
  const generated = build()

  if (checkMode) {
    let existing
    try {
      existing = readFileSync(OUT_PATH, 'utf8')
    } catch {
      console.error(`check:map failed -- ${OUT_PATH} does not exist. Run npm run build:map first.`)
      process.exit(1)
    }
    if (existing !== generated) {
      console.error('check:map failed -- src/data/usMap.js is out of date with its generator/source.')
      console.error('Run `npm run build:map` and commit the result.')
      process.exit(1)
    }
    console.log('check:map OK -- src/data/usMap.js matches the generator output.')
    return
  }

  writeFileSync(OUT_PATH, generated, { encoding: 'utf8' })
  const bytes = Buffer.byteLength(generated, 'utf8')
  console.log(`Wrote ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB, ${bytes} bytes)`)
}

main()
