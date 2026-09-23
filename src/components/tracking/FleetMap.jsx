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
import { greatCirclePoints } from '../../utils/usProjection'
import { formatMoney, formatEta } from '../../utils/format'
import { STATUS_LABEL } from '../../data/mockData'
// MapLibre's own stylesheet -- its controls (attribution, zoom) and
// popups need it. Imported here, not in the page, so it travels with
// this lazily-loaded chunk instead of the entry bundle.
import 'maplibre-gl/dist/maplibre-gl.css'

import { STYLE_URL, US_BOUNDS, NORTH_AMERICA_BOUNDS, readColors, currentTheme } from '../map/mapBase'

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

// LineString coordinates for every load's lane. `routeGeometry`
// ([[lon,lat], ...], tracking.service.js's alternative-0 road route) wins
// when the backend has one -- the great-circle sampler is the fallback
// for a lane no one has ever searched, same as the marker itself
// (position.js's positionFor -- geometrySource says which one ran). The
// LINE never recolors by source: `late` still drives color, source is a
// fact stated in words (the selected load's detail panel), not a verdict
// painted onto the map.
function lanesToGeoJSON(loads) {
  return {
    type: 'FeatureCollection',
    features: loads
      .filter((l) => l.originPos && l.destinationPos)
      .map((l) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: Array.isArray(l.routeGeometry) && l.routeGeometry.length >= 2
            ? l.routeGeometry
            : greatCirclePoints(l.originPos, l.destinationPos, 32),
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
      properties: {
        id: idStr(l.id),
        late: Boolean(l.late),
        // Popup fields, formatted HERE rather than at hover time: the
        // popup's DOM builder reads properties only, so it never needs the
        // load objects and never re-formats the same number twice.
        route: `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`,
        progress: `${Math.round((l.progress ?? 0) * 100)}%`,
        remaining: l.distanceRemainingMi != null ? `${Math.round(l.distanceRemainingMi).toLocaleString('en-US')} mi` : '—',
        eta: formatEta(l.etaAt, l.promisedEtaAt) ?? '—',
        rate: formatMoney(l.rateUsd),
      },
    })),
  }
}

// The A→B lane the user searched, as [lon, lat] pairs along a great
// circle -- dashed on the map (a straight-line placeholder, not a road).
//
// `hasAlternatives` is true once getLaneRoutes() has real road geometry
// for this lane (Tracking.jsx's routeAlternatives prop). This line is
// suppressed in that case -- the real roads (routeAlternativesGeoJSON)
// take over -- and stays drawn while a route fetch is in flight or failed
// (ROUTE_UNAVAILABLE), which is exactly when a straight-line estimate is
// the only distance the page can show.
function searchLaneLine(searchLane, hasAlternatives) {
  if (!searchLane?.origin || !searchLane?.destination || hasAlternatives) {
    return { type: 'FeatureCollection', features: [] }
  }
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: greatCirclePoints(searchLane.origin, searchLane.destination, 48),
      },
      properties: {},
    }],
  }
}

// The search lane's endpoint(s) -- both when the lane is complete, the
// one searched end when only one side was typed. A/B labels stay in the
// panel; on the map the distinct styling says "these are the searched
// places", not another fleet dot.
function searchLanePoints(searchLane) {
  const ends = []
  if (searchLane?.origin) ends.push(searchLane.origin)
  if (searchLane?.destination) ends.push(searchLane.destination)
  return {
    type: 'FeatureCollection',
    features: ends.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {},
    })),
  }
}

// Each recommendation's own lane, drawn faint so the market's shape is
// visible around the searched one without competing with it for ink.
function resultLanesGeoJSON(resultLanes) {
  return {
    type: 'FeatureCollection',
    features: (resultLanes ?? [])
      .filter((r) => r.origin && r.destination)
      .map((r) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: greatCirclePoints(r.origin, r.destination, 32),
        },
        properties: { id: idStr(r.id) },
      })),
  }
}

// The lane-route panel's real road alternatives (getLaneRoutes(), up to
// three, OSRM's own [lon,lat] order). `activeIndex` marks the one the
// panel has highlighted (default: shortest duration -- "Fastest", a
// measurement Tracking.jsx computes, not a recommendation this file
// makes) so it can be drawn on its own layer, on top, bold -- the rest
// stay faint underneath. A route whose geometry came back too short to
// draw (fewer than 2 points) is dropped rather than drawn as a dot.
function routeAlternativesGeoJSON(routeAlternatives, activeIndex) {
  return {
    type: 'FeatureCollection',
    features: (routeAlternatives ?? [])
      .filter((r) => Array.isArray(r.geometry) && r.geometry.length >= 2)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: r.geometry },
        properties: { alternativeIndex: r.alternativeIndex, active: r.alternativeIndex === activeIndex },
      })),
  }
}

// The selected load's own lane line, drawn on its own source/layer so it
// can be upgraded in place once the full-resolution geometry arrives --
// see Tracking.jsx's selectedFullGeometry (GET /tracking/loads/:id/route,
// fetched once per selection, never on the poll). Falls back through
// three tiers, most-accurate first: the full geometry once fetched, the
// simplified board copy every load already carries while that fetch is
// in flight or has failed, and the great-circle arc for a lane no one
// has ever searched at all -- the exact same fallback order
// lanesToGeoJSON() below already uses for every OTHER (unselected) lane.
// `id`/`late` stay on the feature so CLICKABLE_LAYERS' click handler and
// the late-color paint expression keep working exactly as before.
function selectedLaneGeoJSON(selectedLoad, fullGeometry) {
  if (!selectedLoad?.originPos || !selectedLoad?.destinationPos) {
    return { type: 'FeatureCollection', features: [] }
  }
  const coordinates = Array.isArray(fullGeometry) && fullGeometry.length >= 2
    ? fullGeometry
    : Array.isArray(selectedLoad.routeGeometry) && selectedLoad.routeGeometry.length >= 2
      ? selectedLoad.routeGeometry
      : greatCirclePoints(selectedLoad.originPos, selectedLoad.destinationPos, 32)
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { id: idStr(selectedLoad.id), late: Boolean(selectedLoad.late) },
    }],
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
// The road's own services -- fuel stops, truck stops, repair shops and
// rest areas (facilities, migration 035). Generated, never real brands;
// see scripts/seed/vocabulary.js's banned-brand rule.
function facilitiesToGeoJSON(facilities) {
  return {
    type: 'FeatureCollection',
    features: (facilities ?? [])
      .filter((f) => Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lon)))
      .map((f) => ({
        type: 'Feature',
        properties: {
          name: f.name,
          kind: f.kind,
          place: `${f.nearCity}, ${f.nearState}`,
          diesel: f.fuelPriceCents == null ? '' : `$${(f.fuelPriceCents / 100).toFixed(2)}/gal`,
          amenities: (f.amenities ?? []).join(' · '),
        },
        geometry: { type: 'Point', coordinates: [Number(f.lon), Number(f.lat)] },
      })),
  }
}

// One popup's worth of a stop: what it is, where it is, what diesel costs.
function facilityPopupEl(props) {
  const root = document.createElement('div')
  root.className = 'fleet-popup'
  const head = document.createElement('div')
  head.className = 'fleet-popup-head'
  const name = document.createElement('span')
  name.className = 'fleet-popup-num'
  name.textContent = props.name
  head.append(name)
  const line = document.createElement('div')
  line.className = 'fleet-popup-route'
  line.textContent = [FACILITY_LABEL[props.kind] ?? props.kind, props.place, props.diesel].filter(Boolean).join(' · ')
  root.append(head, line)
  if (props.amenities) {
    const am = document.createElement('div')
    am.className = 'fleet-popup-route'
    am.textContent = props.amenities
    root.append(am)
  }
  return root
}

const FACILITY_LABEL = {
  truck_stop: 'Truck stop',
  fuel: 'Fuel',
  repair: 'Repair',
  rest_area: 'Rest area',
}

function addLayers(map, { loads, cities, facilities, selected, selectedFullGeometry, searchLane, resultLanes, routeAlternatives, activeAltIndex, colors }) {
  const selectedId = idStr(selected)
  const selectedLoad = loads.find((l) => idStr(l.id) === selectedId) ?? null

  // Under everything else: the stops are the backdrop the freight moves
  // across, not the subject of the page.
  map.addSource('facilities', { type: 'geojson', data: facilitiesToGeoJSON(facilities) })
  map.addLayer({
    id: 'facilities-layer',
    type: 'circle',
    source: 'facilities',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 6, 3.2, 10, 5],
      'circle-color': [
        'match', ['get', 'kind'],
        'fuel', colors.green,
        'truck_stop', colors.amber,
        'repair', colors.red,
        colors.muted,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-color': colors.panel,
      'circle-stroke-width': 0.5,
    },
  })

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
  // Its OWN source (not a filter on `lanes`), fed by selectedLaneGeoJSON --
  // see that function's own header for why: it upgrades to the full
  // geometry independently of the board's simplified `lanes` source.
  map.addSource('selected-lane', { type: 'geojson', data: selectedLaneGeoJSON(selectedLoad, selectedFullGeometry) })
  map.addLayer({
    id: 'lanes-selected-layer',
    type: 'line',
    source: 'selected-lane',
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

  // The lane-search panel's drawing, above the fleet: each recommended
  // posting's lane faint, the searched lane dashed and bold on top. The
  // endpoints get the panel color + a blue stroke -- clearly not a truck.
  map.addSource('result-lanes', { type: 'geojson', data: resultLanesGeoJSON(resultLanes) })
  map.addLayer({
    id: 'result-lanes-layer',
    type: 'line',
    source: 'result-lanes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.blue,
      'line-width': 1,
      'line-opacity': 0.28,
    },
  })

  const hasAlternatives = (routeAlternatives?.length ?? 0) > 0

  map.addSource('search-lane', { type: 'geojson', data: searchLaneLine(searchLane, hasAlternatives) })
  map.addLayer({
    id: 'search-lane-line',
    type: 'line',
    source: 'search-lane',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.blue,
      'line-width': 2.6,
      'line-dasharray': [1.2, 1.2],
      'line-opacity': 0.95,
    },
  })
  map.addSource('search-lane-points', { type: 'geojson', data: searchLanePoints(searchLane) })
  map.addLayer({
    id: 'search-lane-points-layer',
    type: 'circle',
    source: 'search-lane-points',
    paint: {
      'circle-radius': 6,
      'circle-color': colors.panel,
      'circle-stroke-color': colors.blue,
      'circle-stroke-width': 2.5,
    },
  })

  // The route panel's real road alternatives, drawn above everything
  // else the search draws: the un-picked routes faint, the active one
  // bold on its own layer so it always wins the overlap -- Google Maps'
  // own convention for "here are your options, this is the one shown".
  map.addSource('route-alternatives', {
    type: 'geojson',
    data: routeAlternativesGeoJSON(routeAlternatives, activeAltIndex),
  })
  map.addLayer({
    id: 'route-alternatives-layer',
    type: 'line',
    source: 'route-alternatives',
    filter: ['!=', ['get', 'active'], true],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.blue,
      'line-width': 2.2,
      'line-opacity': 0.3,
    },
  })
  map.addLayer({
    id: 'route-alternatives-active-layer',
    type: 'line',
    source: 'route-alternatives',
    filter: ['==', ['get', 'active'], true],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.blue,
      'line-width': 3.4,
      'line-opacity': 0.95,
    },
  })
}

const CLICKABLE_LAYERS = ['fleet-layer', 'fleet-selected-layer', 'lanes-layer', 'lanes-selected-layer']

// The load popup's DOM, in the same language as the route planner's trip
// summary (RoutePlanner.jsx): a labeled head bar with the status badge,
// the route line, and a two-column key/value grid for the numbers. Built
// as real DOM (MapLibre's setDOM), not an HTML string -- the same reason
// the rest of the app never innerHTML's user-shaped text. Formatted values
// arrive pre-formatted in the feature properties (fleetToGeoJSON).
function loadPopupEl(p) {
  const root = document.createElement('div')
  root.className = 'fleet-popup'

  const head = document.createElement('div')
  head.className = 'fleet-popup-head'
  const num = document.createElement('span')
  num.className = 'fleet-popup-num mono'
  num.textContent = `#${p.id}`
  const badge = document.createElement('span')
  badge.className = 'badge ' + (p.late ? 'crit' : 'ontime')
  const dot = document.createElement('span')
  dot.className = 'dot'
  badge.append(dot, document.createTextNode(p.late ? STATUS_LABEL.crit : STATUS_LABEL.ontime))
  head.append(num, badge)

  const route = document.createElement('div')
  route.className = 'fleet-popup-route'
  route.textContent = p.route

  const grid = document.createElement('div')
  grid.className = 'fleet-popup-grid'
  const CELLS = [
    ['Progress', p.progress, true],
    ['Remaining', p.remaining, true],
    ['ETA', p.eta, true],
    ['Rate', p.rate, true],
  ]
  for (const [key, val] of CELLS) {
    const cell = document.createElement('div')
    cell.className = 'fleet-popup-cell'
    const k = document.createElement('div')
    k.className = 'fleet-popup-key'
    k.textContent = key
    const v = document.createElement('div')
    v.className = 'fleet-popup-val mono'
    v.textContent = val
    cell.append(k, v)
    grid.append(cell)
  }

  root.append(head, route, grid)
  return root
}

// A click already opens the full detail in the side panel; the popup's job
// is the glance -- so hover on a load point (or its lane) previews it, and
// the pointer leaving either layer takes it away.
function showLoadPopup(map, popup, props, lngLat) {
  popup.setDOMContent(loadPopupEl(props))
  popup.setLngLat(lngLat).addTo(map)
}

function hideLoadPopup(popup) {
  popup.remove()
}

export default function FleetMap({
  loads, cities = [], facilities = [], selected, onSelect, searchLane = null, resultLanes = [], fitKey = 0,
  routeAlternatives = [], activeAltIndex = null, altFitKey = 0, selectedFullGeometry = null,
}) {
  const wrapRef = useRef(null)
  const mapRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [tileError, setTileError] = useState(null)

  // Refs so the map's event handlers (bound once, at mount) and the
  // post-setStyle relayer always see the latest props without the mount
  // effect depending on them.
  const loadsRef = useRef(loads)
  const citiesRef = useRef(cities)
  const facilitiesRef = useRef(facilities)
  const selectedRef = useRef(selected)
  const selectedFullGeometryRef = useRef(selectedFullGeometry)
  const onSelectRef = useRef(onSelect)
  const searchLaneRef = useRef(searchLane)
  const resultLanesRef = useRef(resultLanes)
  const fitKeyRef = useRef(fitKey)
  const routeAlternativesRef = useRef(routeAlternatives)
  const activeAltIndexRef = useRef(activeAltIndex)
  const altFitKeyRef = useRef(altFitKey)
  useEffect(() => { loadsRef.current = loads }, [loads])
  useEffect(() => { citiesRef.current = cities }, [cities])
  useEffect(() => { facilitiesRef.current = facilities }, [facilities])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { selectedFullGeometryRef.current = selectedFullGeometry }, [selectedFullGeometry])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { searchLaneRef.current = searchLane }, [searchLane])
  useEffect(() => { resultLanesRef.current = resultLanes }, [resultLanes])
  useEffect(() => { fitKeyRef.current = fitKey }, [fitKey])
  useEffect(() => { routeAlternativesRef.current = routeAlternatives }, [routeAlternatives])
  useEffect(() => { activeAltIndexRef.current = activeAltIndex }, [activeAltIndex])
  useEffect(() => { altFitKeyRef.current = altFitKey }, [altFitKey])

  // ---- create the map once ----
  useEffect(() => {
    const map = new MapLibreMap({
      container: wrapRef.current,
      style: STYLE_URL[currentTheme()],
      // Framed at the continental US from the first paint (refined by the
      // fitBounds below once the style has loaded) so there is never a
      // flash of the whole globe while tiles are still resolving.
      bounds: US_BOUNDS,
      // Hard wall: the fleet runs in the US, Canada and Mexico, so those
      // are the only places the user can pan to. Without this the map is
      // the whole planet and one stray drag loses the country entirely.
      maxBounds: NORTH_AMERICA_BOUNDS,
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
        facilities: facilitiesRef.current,
        selected: selectedRef.current,
        selectedFullGeometry: selectedFullGeometryRef.current,
        searchLane: searchLaneRef.current,
        resultLanes: resultLanesRef.current,
        routeAlternatives: routeAlternativesRef.current,
        activeAltIndex: activeAltIndexRef.current,
        colors: readColors(),
      })
      setMapReady(true)
    })

    CLICKABLE_LAYERS.forEach((layerId) => {
      map.on('click', layerId, (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id != null && id !== '') onSelectRef.current?.(id)
      })
      // Hover on a fleet point or its lane previews the load in the same
      // popup (the point carries the formatted fields; the lane falls back
      // to the fleet feature with the same id -- lanes carry id+late only).
      map.on('mouseenter', layerId, (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = e.features?.[0]
        const p = f?.properties
        if (!p?.id) return
        if (layerId === 'fleet-layer' || layerId === 'fleet-selected-layer') {
          showLoadPopup(map, loadPopup, p, f.geometry.coordinates)
        } else {
          const hit = (loadsRef.current ?? []).find((l) => idStr(l.id) === p.id)
          const pt = hit && Number.isFinite(hit.lon) ? [hit.lon, hit.lat] : f.geometry?.coordinates?.slice?.(0, 2)
          if (hit) {
            const fl = fleetToGeoJSON([hit]).features[0]
            showLoadPopup(map, loadPopup, fl.properties, pt)
          }
        }
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        hideLoadPopup(loadPopup)
      })
    })

    // City name on hover, replacing the SVG map's <title> tooltip.
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 8 })
    // The load preview popup -- separate instance from the city tooltip:
    // different content lifecycle (mouseenter/leave per layer vs per
    // feature), and hideLoadPopup must never hide a city name mid-hover.
    const loadPopup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: '280px' })
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

    // A stop on hover: what it is, where it is, what diesel costs there.
    // Same popup instance as the load preview -- only one of the two can
    // be under the pointer at a time.
    map.on('mouseenter', 'facilities-layer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      if (!f) return
      loadPopup.setDOMContent(facilityPopupEl(f.properties)).setLngLat(f.geometry.coordinates).addTo(map)
    })
    map.on('mouseleave', 'facilities-layer', () => {
      map.getCanvas().style.cursor = ''
      hideLoadPopup(loadPopup)
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
      loadPopup.remove()
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
        facilities: facilitiesRef.current,
          selected: selectedRef.current,
          selectedFullGeometry: selectedFullGeometryRef.current,
          searchLane: searchLaneRef.current,
          resultLanes: resultLanesRef.current,
          routeAlternatives: routeAlternativesRef.current,
          activeAltIndex: activeAltIndexRef.current,
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

  // The stops arrive on their own fetch (they never change while the page
  // is open, so this runs once) -- swapped in place like every other
  // source, never by rebuilding the map.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getSource('facilities')) return
    map.getSource('facilities').setData(facilitiesToGeoJSON(facilities))
  }, [facilities, mapReady])

  // Selection changes restyle only -- no flyTo/fitBounds, so picking a row
  // in the list or a poll that reorders `loads` never yanks the camera.
  // Also reruns when `selectedFullGeometry` itself changes (the fetch in
  // Tracking.jsx resolves after selection, on its own schedule) so the
  // selected line upgrades from the simplified/arc fallback to the real
  // road the moment it arrives, with no other prop needing to change.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('lanes-selected-layer')) return
    const selectedId = idStr(selected)
    map.setFilter('fleet-layer', ['!=', ['get', 'id'], selectedId])
    map.setFilter('fleet-selected-layer', ['==', ['get', 'id'], selectedId])
    const selectedLoad = loads.find((l) => idStr(l.id) === selectedId) ?? null
    map.getSource('selected-lane')?.setData(selectedLaneGeoJSON(selectedLoad, selectedFullGeometry))
    map.getSource('endpoints')?.setData(endpointsToGeoJSON(selectedLoad))
  }, [selected, loads, selectedFullGeometry, mapReady])

  // The search panel's drawing: swap the lane/results data in place. The
  // camera is deliberately NOT driven from here -- a poll re-render would
  // otherwise re-frame the view mid-read. Only an explicit user action
  // (Enter / Search) bumps fitKey, and that is what may move the camera.
  // `hasAlternatives` (real routes on screen) also decides whether the
  // dashed straight-line placeholder is still the thing being drawn --
  // see searchLaneLine()'s own comment.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer('search-lane-line')) return
    const hasAlternatives = routeAlternatives.length > 0
    map.getSource('search-lane')?.setData(searchLaneLine(searchLane, hasAlternatives))
    map.getSource('search-lane-points')?.setData(searchLanePoints(searchLane))
    map.getSource('result-lanes')?.setData(resultLanesGeoJSON(resultLanes))
  }, [searchLane, resultLanes, routeAlternatives, mapReady])

  // The route panel's own drawing: swap in the real road alternatives and
  // which one is active. No camera move here either -- picking a row is
  // what may move it, via the altFitKey effect below, same split as the
  // lane search's fitKey.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getSource('route-alternatives')) return
    map.getSource('route-alternatives').setData(routeAlternativesGeoJSON(routeAlternatives, activeAltIndex))
  }, [routeAlternatives, activeAltIndex, mapReady])

  // The one sanctioned camera move: the user searched. Frame the lane
  // (or the single searched end) with padding for the endpoint dots and
  // labels; everything else stays where the user left it.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !fitKey) return
    const lane = searchLaneRef.current
    const pts = []
    if (lane?.origin) pts.push([lane.origin.lon, lane.origin.lat])
    if (lane?.destination) pts.push([lane.destination.lon, lane.destination.lat])
    if (pts.length === 0) return
    if (pts.length === 1) {
      map.easeTo({ center: pts[0], zoom: Math.max(map.getZoom(), 5.5), duration: 600 })
      return
    }
    map.fitBounds([pts[0], pts[1]], { padding: 90, duration: 800, maxZoom: 7 })
  }, [fitKey, mapReady])

  // The other sanctioned camera move: the user picked one route option
  // out of the up-to-three the panel lists. Frames that route's own
  // geometry (a real road bends outside the straight line between its
  // endpoints, so the bbox has to come from every coordinate, not just
  // the two ends) rather than the whole lane -- clicking a specific
  // alternative is a request to look at THAT road, closer than the
  // lane-level fitKey view above.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !altFitKey) return
    const route = routeAlternativesRef.current.find((r) => r.alternativeIndex === activeAltIndexRef.current)
    const coords = route?.geometry
    if (!Array.isArray(coords) || coords.length === 0) return
    let minLon = Infinity
    let minLat = Infinity
    let maxLon = -Infinity
    let maxLat = -Infinity
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 90, duration: 800, maxZoom: 8 })
  }, [altFitKey, mapReady])

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
