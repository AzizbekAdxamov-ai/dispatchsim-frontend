import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// This app's colors for MapLibre's own attribution and popup chrome --
// after MapLibre's stylesheet, and specific enough not to depend on that.
import '../map/mapBase.css'
import { STYLE_URL, US_BOUNDS, NORTH_AMERICA_BOUNDS, readColors, currentTheme } from '../map/mapBase'

// The planner's map: the trip's road line, its waypoints (A, 1..5, B) and
// the stops the HOS-legal plan makes on the way. Same basemap and bounds
// as the fleet map (mapBase.js).

function waypointsGeoJSON(waypoints) {
  return {
    type: 'FeatureCollection',
    features: (waypoints ?? []).map((w, i, all) => ({
      type: 'Feature',
      properties: { label: i === 0 ? 'A' : i === all.length - 1 ? 'B' : String(i), name: `${w.city}, ${w.state}` },
      geometry: { type: 'Point', coordinates: [w.lon, w.lat] },
    })),
  }
}

function lineGeoJSON(geometry) {
  return {
    type: 'FeatureCollection',
    features: geometry && geometry.length > 1
      ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geometry } }]
      : [],
  }
}

function plannedStopsGeoJSON(stops) {
  return {
    type: 'FeatureCollection',
    features: (stops ?? []).filter((s) => s.facility).map((s) => ({
      type: 'Feature',
      properties: { reason: s.reason },
      geometry: { type: 'Point', coordinates: [s.facility.lon, s.facility.lat] },
    })),
  }
}

const FACILITY_LABEL = {
  truck_stop: 'Truck stop',
  fuel: 'Fuel',
  repair: 'Repair',
  rest_area: 'Rest area',
}

// The stops the Truck Stops report lists, as map points. Same rows, same
// order, same numbers -- trips.service.js builds `truckStops` once and the
// table and the map read that one array, so a stop can never be in the
// report and missing from the map.
function truckStopsGeoJSON(stops) {
  return {
    type: 'FeatureCollection',
    features: (stops ?? [])
      .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon)))
      .map((s) => ({
        type: 'Feature',
        properties: {
          name: s.name,
          kind: s.kind,
          place: `${s.city}, ${s.state}`,
          mile: `Mile ${Number(s.mile).toLocaleString('en-US')}`,
          off: s.offRouteMi ? `${s.offRouteMi} mi off route` : 'On route',
          diesel: s.fuelPriceCents == null ? '' : `$${(s.fuelPriceCents / 100).toFixed(2)}/gal`,
          amenities: (s.amenities ?? []).join(' \u00b7 '),
        },
        geometry: { type: 'Point', coordinates: [Number(s.lon), Number(s.lat)] },
      })),
  }
}

// One stop's worth of facts on hover: what it is, where it is, what
// diesel costs. Facts only -- the map never rates a stop.
function stopPopupEl(props) {
  const root = document.createElement('div')
  root.className = 'route-popup'
  const name = document.createElement('div')
  name.className = 'route-popup-name'
  name.textContent = props.name
  const line = document.createElement('div')
  line.className = 'route-popup-line'
  line.textContent = [FACILITY_LABEL[props.kind] ?? props.kind, props.place, props.diesel].filter(Boolean).join(' \u00b7 ')
  const where = document.createElement('div')
  where.className = 'route-popup-line'
  where.textContent = [props.mile, props.off].filter(Boolean).join(' \u00b7 ')
  root.append(name, line, where)
  if (props.amenities) {
    const am = document.createElement('div')
    am.className = 'route-popup-line'
    am.textContent = props.amenities
    root.append(am)
  }
  return root
}

function addLayers(map, trip, colors) {
  map.addSource('trip-line', { type: 'geojson', data: lineGeoJSON(trip?.geometry) })
  map.addLayer({
    id: 'trip-line', type: 'line', source: 'trip-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': colors.blue, 'line-width': 5, 'line-opacity': 0.85 },
  })
  // Every stop inside the route corridor, under the planned ones: the
  // corridor is the backdrop, the HOS plan is the subject. Names appear
  // once the user is zoomed in far enough for them not to overlap; the
  // dot alone carries it at country zoom.
  map.addSource('trip-facilities', { type: 'geojson', data: truckStopsGeoJSON(trip?.truckStops) })
  map.addLayer({
    id: 'trip-facilities', type: 'circle', source: 'trip-facilities',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.4, 6, 4, 10, 6.5],
      'circle-color': [
        'match', ['get', 'kind'],
        'fuel', colors.green,
        'truck_stop', colors.amber,
        'repair', colors.red,
        colors.muted,
      ],
      'circle-opacity': 0.9,
      'circle-stroke-color': colors.panel,
      'circle-stroke-width': 1,
    },
  })
  map.addLayer({
    id: 'trip-facility-labels', type: 'symbol', source: 'trip-facilities',
    // No minzoom floor below 4: MapLibre's own label collision decides how
    // many names fit, the way a road map does -- a fixed zoom gate either
    // hid every name on a long trip (which frames at z5) or printed them
    // all on top of each other.
    minzoom: 4,
    layout: {
      'text-field': ['get', 'name'],
      // The basemap's own font. MapLibre's default fontstack ("Open Sans
      // Regular, Arial Unicode MS Regular") is not one OpenFreeMap serves:
      // every glyph 404'd and was redrawn locally, one warning per letter,
      // so the names came out in a different face from the map's own.
      'text-font': ['Noto Sans Regular'],
      'text-size': 10.5,
      'text-offset': [0, 0.9],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': colors.text2,
      'text-halo-color': colors.panel,
      'text-halo-width': 1.4,
    },
  })

  // Where the law stops the truck: rest (amber) and fuel (green).
  map.addSource('trip-stops', { type: 'geojson', data: plannedStopsGeoJSON(trip?.plannedStops) })
  map.addLayer({
    id: 'trip-stops', type: 'circle', source: 'trip-stops',
    paint: {
      'circle-radius': 5,
      'circle-color': ['match', ['get', 'reason'], 'rest', colors.amber, colors.green],
      'circle-stroke-color': colors.panel,
      'circle-stroke-width': 1.5,
    },
  })
  map.addSource('trip-points', { type: 'geojson', data: waypointsGeoJSON(trip?.waypoints) })
  map.addLayer({
    id: 'trip-points', type: 'circle', source: 'trip-points',
    paint: { 'circle-radius': 10, 'circle-color': colors.blue, 'circle-stroke-color': colors.panel, 'circle-stroke-width': 2 },
  })
  map.addLayer({
    id: 'trip-point-labels', type: 'symbol', source: 'trip-points',
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-allow-overlap': true },
    paint: { 'text-color': colors.panel },
  })
}

function fit(map, trip) {
  const pts = trip?.geometry ?? []
  if (pts.length < 2) return
  let minLon = Infinity; let minLat = Infinity; let maxLon = -Infinity; let maxLat = -Infinity
  for (const [lon, lat] of pts) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon)
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
  }
  map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 60, duration: 600 })
}

export default function RouteMap({ trip }) {
  const wrapRef = useRef(null)
  const mapRef = useRef(null)
  const tripRef = useRef(trip)
  const [tileError, setTileError] = useState(null)

  useEffect(() => { tripRef.current = trip }, [trip])

  useEffect(() => {
    const map = new MapLibreMap({
      container: wrapRef.current,
      style: STYLE_URL[currentTheme()],
      bounds: US_BOUNDS,
      maxBounds: NORTH_AMERICA_BOUNDS,
      attributionControl: { compact: false },
    })
    mapRef.current = map

    // One reusable popup, as on the fleet map: hovering a stop shows its
    // facts, leaving hides them. Bound to the layer id rather than to a
    // layer object, so it survives the theme flip that re-adds the layers.
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: '260px' })
    map.on('mouseenter', 'trip-facilities', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      if (!f) return
      popup.setDOMContent(stopPopupEl(f.properties)).setLngLat(f.geometry.coordinates).addTo(map)
    })
    map.on('mouseleave', 'trip-facilities', () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })

    // Loud, not silent: a map that failed to draw says why (FleetMap.jsx
    // makes the same choice).
    map.on('error', (e) => {
      const reason = e?.error?.message || e?.error?.status || 'no reason reported'
      setTileError((prev) => prev ?? String(reason))
    })
    map.on('load', () => {
      // The panel beside it, the tab row above it and this page's own
      // lazy chunk all settle after the map is constructed, so the canvas
      // is built against whatever height the container had at that
      // instant -- which was none, and the map drew 300px tall inside a
      // 766px pane. FleetMap.jsx watches its wrapper for exactly this
      // reason; so does this one now.
      map.resize()
      addLayers(map, tripRef.current, readColors())
      fit(map, tripRef.current)
    })

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(wrapRef.current)

    // Theme flips restyle the basemap and redraw our layers.
    let lastTheme = currentTheme()
    const observer = new MutationObserver(() => {
      const theme = currentTheme()
      if (theme === lastTheme) return
      lastTheme = theme
      map.setStyle(STYLE_URL[theme])
      map.once('styledata', () => addLayers(map, tripRef.current, readColors()))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      resizeObserver.disconnect()
      observer.disconnect()
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    map.getSource('trip-line')?.setData(lineGeoJSON(trip?.geometry))
    map.getSource('trip-points')?.setData(waypointsGeoJSON(trip?.waypoints))
    map.getSource('trip-facilities')?.setData(truckStopsGeoJSON(trip?.truckStops))
  map.getSource('trip-stops')?.setData(plannedStopsGeoJSON(trip?.plannedStops))
    if (trip) fit(map, trip)
    else map.fitBounds(US_BOUNDS, { padding: 24, duration: 600 })
  }, [trip])

  return (
    <div className="route-map-wrap">
      <div ref={wrapRef} className="route-map" />
      {tileError && <div className="route-map-error">The map could not load: {tileError}</div>}
    </div>
  )
}
