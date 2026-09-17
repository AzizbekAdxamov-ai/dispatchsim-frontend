// The map layer: a real vector basemap (MapLibre GL JS + OpenFreeMap tiles)
// with the fleet drawn on top as GeoJSON layers.
//
// This replaces the hand-drawn SVG map (TrackingMap.jsx, kept in the tree
// but no longer wired up from Tracking.jsx). Its lane arcs still come from
// usProjection.js's greatCirclePoints() -- the same sampling routine the
// SVG map's lanePathD() now calls -- so the two implementations can never
// draw a different curve for the same lane.
//
// GeoJSON sources/layers rather than one DOM marker per city/load: at
// 61 cities plus however many loads are in transit, a MapLibre circle/line
// layer batches into a handful of draw calls where DOM markers would be
// one positioned element each, repositioned on every 10s poll.
//
// The map instance is created exactly once (empty-deps effect) and never
// torn down for a prop change -- only its GeoJSON sources' data and a
// couple of layer filters are updated when loads/cities/selected change,
// which is what keeps re-selecting or polling from ever moving or
// re-framing the camera.

import { useEffect, useRef, useState } from 'react'
// maplibre-gl 6.x's ESM build has no default export (unlike the older
// `import maplibregl from 'maplibre-gl'` pattern seen in most docs/examples
// still online) -- import the pieces used here by name instead. `Map` is
// aliased to avoid shadowing the built-in global.
import { Map as MapLibreMap, Popup } from 'maplibre-gl'
import { PROJECTION_BOUNDS } from '../../data/usMap'
import { greatCirclePoints } from '../../utils/usProjection'
// MapLibre's own stylesheet -- its controls (attribution, zoom) and
// popups need it. Imported here, not in the page, so it travels with
// this lazily-loaded chunk instead of the entry bundle.
import 'maplibre-gl/dist/maplibre-gl.css'

// OpenFreeMap's hosted styles (free, no API key). Picked per theme so the
// basemap's own ink matches the app's dark/cream split rather than fighting
// it -- 'positron' is OpenFreeMap's light/muted style, 'dark' its dark one.
const STYLE_URL = {
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

// Padding added around the exact Census bbox before it becomes maxBounds.
// A hard box drawn right at the coastline would put open ocean or the
// Canada/Mexico border strip at the very edge of what the user can pan to,
// which feels clipped rather than like the edge of the country. A handful
// of degrees (roughly one state's width) gives room to pan a little past
// the mapped cities without drifting off into other continents, which is
// the whole point of maxBounds here -- this board tracks a US-only fleet.
const BOUNDS_PAD_LON = 5
const BOUNDS_PAD_LAT = 4

const US_BOUNDS = [
  [PROJECTION_BOUNDS.minLon - BOUNDS_PAD_LON, US_LAT_MIN - BOUNDS_PAD_LAT],
  [PROJECTION_BOUNDS.maxLon + BOUNDS_PAD_LON, US_LAT_MAX + BOUNDS_PAD_LAT],
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
function readColors() {
  const style = getComputedStyle(document.documentElement)
  const get = (name) => style.getPropertyValue(name).trim()
  return {
    blue: get('--blue'),
    red: get('--red'),
    muted: get('--text-3'),
    panel: get('--panel'),
    text2: get('--text-2'),
  }
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function idStr(id) {
  return id == null ? '' : String(id)
}

function citiesToGeoJSON(cities) {
  return {
    type: 'FeatureCollection',
    features: cities.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      properties: { name: `${c.city}, ${c.state}` },
    })),
  }
}

// LineString coordinates from the shared great-circle sampler -- it already
// returns [lon, lat] pairs, GeoJSON's own coordinate order, so no swapping.
function lanesToGeoJSON(loads) {
  return {
    type: 'FeatureCollection',
    features: loads
      .filter((l) => l.originPos && l.destinationPos)
      .map((l) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: greatCirclePoints(l.originPos, l.destinationPos, 32),
        },
        properties: { id: idStr(l.id), late: Boolean(l.late) },
      })),
  }
}

function fleetToGeoJSON(loads) {
  return {
    type: 'FeatureCollection',
    features: loads.map((l) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.lon, l.lat] },
      properties: { id: idStr(l.id), late: Boolean(l.late) },
    })),
  }
}

// Endpoints of the selected lane only -- at fleet scale every endpoint dot
// would be noise; selection is what gets the detail (same call the SVG
// map made).
function endpointsToGeoJSON(load) {
  if (!load?.originPos || !load?.destinationPos) {
    return { type: 'FeatureCollection', features: [] }
  }
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [load.originPos.lon, load.originPos.lat] }, properties: {} },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [load.destinationPos.lon, load.destinationPos.lat] }, properties: {} },
    ],
  }
}

// Adds every source/layer this map draws. Called once after the map's
// initial 'load', and again after every setStyle() (theme flip) once the
// new style's 'styledata' fires -- setStyle() throws the old style's
// sources and layers away, so there is nothing to patch, only to redo.
function addLayers(map, { loads, cities, selected, colors }) {
  const selectedId = idStr(selected)
  const selectedLoad = loads.find((l) => idStr(l.id) === selectedId) ?? null

  map.addSource('cities', { type: 'geojson', data: citiesToGeoJSON(cities) })
  map.addLayer({
    id: 'cities-layer',
    type: 'circle',
    source: 'cities',
    paint: {
      'circle-radius': 2.5,
      'circle-color': colors.muted,
      'circle-opacity': 0.8,
    },
  })

  map.addSource('lanes', { type: 'geojson', data: lanesToGeoJSON(loads) })
  map.addLayer({
    id: 'lanes-layer',
    type: 'line',
    source: 'lanes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['case', ['get', 'late'], colors.red, colors.muted],
      'line-width': 1.4,
      'line-opacity': ['case', ['get', 'late'], 0.55, 0.5],
    },
  })
  map.addLayer({
    id: 'lanes-selected-layer',
    type: 'line',
    source: 'lanes',
    filter: ['==', ['get', 'id'], selectedId],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['case', ['get', 'late'], colors.red, colors.blue],
      'line-width': 2.2,
      'line-opacity': 1,
    },
  })

  map.addSource('endpoints', { type: 'geojson', data: endpointsToGeoJSON(selectedLoad) })
  map.addLayer({
    id: 'endpoints-layer',
    type: 'circle',
    source: 'endpoints',
    paint: {
      'circle-radius': 4,
      'circle-color': colors.panel,
      'circle-stroke-color': colors.text2,
      'circle-stroke-width': 1.5,
    },
  })

  map.addSource('fleet', { type: 'geojson', data: fleetToGeoJSON(loads) })
  map.addLayer({
    id: 'fleet-layer',
    type: 'circle',
    source: 'fleet',
    filter: ['!=', ['get', 'id'], selectedId],
    paint: {
      'circle-radius': 3,
      'circle-color': ['case', ['get', 'late'], colors.red, colors.blue],
      'circle-stroke-color': colors.panel,
      'circle-stroke-width': 1.5,
    },
  })
  // Selected load drawn as its own layer, on top, bigger -- the vector-map
  // equivalent of the SVG map's pulsing marker (no looped paint animation
  // here, but still the clearly-the-one-that's-picked treatment).
  map.addLayer({
    id: 'fleet-selected-layer',
    type: 'circle',
    source: 'fleet',
    filter: ['==', ['get', 'id'], selectedId],
    paint: {
      'circle-radius': 6.5,
      'circle-color': ['case', ['get', 'late'], colors.red, colors.blue],
      'circle-stroke-color': colors.panel,
      'circle-stroke-width': 2,
    },
  })
}

const CLICKABLE_LAYERS = ['fleet-layer', 'fleet-selected-layer', 'lanes-layer', 'lanes-selected-layer']

export default function FleetMap({ loads, cities = [], selected, onSelect }) {
  const wrapRef = useRef(null)
  const mapRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [tileError, setTileError] = useState(null)

  // Refs so the map's event handlers (bound once, at mount) and the
  // post-setStyle relayer always see the latest props without the mount
  // effect depending on them.
  const loadsRef = useRef(loads)
  const citiesRef = useRef(cities)
  const selectedRef = useRef(selected)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { loadsRef.current = loads }, [loads])
  useEffect(() => { citiesRef.current = cities }, [cities])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ---- create the map once ----
  useEffect(() => {
    const map = new MapLibreMap({
      container: wrapRef.current,
      style: STYLE_URL[currentTheme()],
      // Framed at the continental US from the first paint (refined by the
      // fitBounds below once the style has loaded) so there is never a
      // flash of the whole globe while tiles are still resolving.
      bounds: US_BOUNDS,
      // Always show the credit line as text rather than collapsing to an
      // icon on narrow panels -- OpenFreeMap/OpenStreetMap attribution is
      // required, and MapLibre renders it for us automatically from the
      // style's own sources, so it stays correct if the style ever adds a
      // source. Never disable this control.
      attributionControl: { compact: false },
    })
    mapRef.current = map

    // Tile/style fetch failures (e.g. a network that blocks the tile host
    // outright) must not fail silently -- console-only errors are exactly
    // what this project's "loud, not silent" rule forbids.
    //
    // The MESSAGE is kept, not just a boolean: "the map did not draw" and
    // "the map did not draw because the style host refused the request"
    // are different facts, and only the second one can be acted on. The
    // first error wins -- MapLibre re-fires `error` for every tile that
    // follows a bad style, and the tenth message says nothing the first
    // did not.
    map.on('error', (e) => {
      const reason = e?.error?.message || e?.error?.status || 'no reason reported'
      setTileError((prev) => prev ?? String(reason))
    })

    map.on('load', () => {
      map.fitBounds(US_BOUNDS, { padding: 24, duration: 0 })
      // Never let the user zoom out past the view that just fit the whole
      // continental US -- past that point they're looking at open ocean
      // with no fleet in sight, not a smaller version of the country.
      map.setMinZoom(map.getZoom())
      addLayers(map, {
        loads: loadsRef.current,
        cities: citiesRef.current,
        selected: selectedRef.current,
        colors: readColors(),
      })
      setMapReady(true)
    })

    CLICKABLE_LAYERS.forEach((layerId) => {
      map.on('click', layerId, (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id != null && id !== '') onSelectRef.current?.(id)
      })
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
    })

    // City name on hover, replacing the SVG map's <title> tooltip.
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 8 })
    map.on('mouseenter', 'cities-layer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      if (!f) return
      popup.setLngLat(f.geometry.coordinates).setText(f.properties.name).addTo(map)
    })
    map.on('mouseleave', 'cities-layer', () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })

    // The panel this map sits in can change width (sidebar toggle, window
    // resize) without the window itself firing 'resize' -- MapLibre needs
    // to be told explicitly or it keeps rendering into a stale canvas size.
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(wrapRef.current)

    // React StrictMode double-invokes effects in dev; theme flips call
    // setStyle() on this same instance rather than recreating it, so a
    // clean, single teardown here is enough either way.
    return () => {
      resizeObserver.disconnect()
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount-only, see comment above

  // ---- theme flips: swap the style, then redraw our layers on it ----
  useEffect(() => {
    const target = document.documentElement
    let lastTheme = currentTheme()
    const observer = new MutationObserver(() => {
      const theme = currentTheme()
      const map = mapRef.current
      if (theme === lastTheme || !map) return
      lastTheme = theme
      setMapReady(false)
      map.setStyle(STYLE_URL[theme])
      map.once('styledata', () => {
        addLayers(map, {
          loads: loadsRef.current,
          cities: citiesRef.current,
          selected: selectedRef.current,
          colors: readColors(),
        })
        setMapReady(true)
      })
    })
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // ---- data sync: update sources in place, never recreate the map ----
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getSource('cities')) return
    map.getSource('cities').setData(citiesToGeoJSON(cities))
  }, [cities, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getSource('lanes')) return
    map.getSource('lanes').setData(lanesToGeoJSON(loads))
    map.getSource('fleet').setData(fleetToGeoJSON(loads))
  }, [loads, mapReady])

  // Selection changes restyle only -- no flyTo/fitBounds, so picking a row
  // in the list or a poll that reorders `loads` never yanks the camera.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('lanes-selected-layer')) return
    const selectedId = idStr(selected)
    map.setFilter('lanes-selected-layer', ['==', ['get', 'id'], selectedId])
    map.setFilter('fleet-layer', ['!=', ['get', 'id'], selectedId])
    map.setFilter('fleet-selected-layer', ['==', ['get', 'id'], selectedId])
    const selectedLoad = loads.find((l) => idStr(l.id) === selectedId) ?? null
    map.getSource('endpoints')?.setData(endpointsToGeoJSON(selectedLoad))
  }, [selected, loads, mapReady])

  return (
    <div className="fleet-map-wrap">
      <div className="fleet-map-canvas" ref={wrapRef} />
      {tileError && (
        <div className="tracking-map-tile-error">
          <div>The map could not be drawn.</div>
          <div className="tracking-map-tile-reason mono">{tileError}</div>
        </div>
      )}
    </div>
  )
}
