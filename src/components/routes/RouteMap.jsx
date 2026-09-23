import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
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

function addLayers(map, trip, colors) {
  map.addSource('trip-line', { type: 'geojson', data: lineGeoJSON(trip?.geometry) })
  map.addLayer({
    id: 'trip-line', type: 'line', source: 'trip-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': colors.blue, 'line-width': 5, 'line-opacity': 0.85 },
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
    layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-allow-overlap': true },
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
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    map.getSource('trip-line')?.setData(lineGeoJSON(trip?.geometry))
    map.getSource('trip-points')?.setData(waypointsGeoJSON(trip?.waypoints))
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
