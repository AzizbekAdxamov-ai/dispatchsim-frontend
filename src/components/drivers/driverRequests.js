// A driver's standing requests (drivers.preferences, backend migration
// 054), as the profile page says them. Here so node:test can import it.
//
// The backend's reader is backend/src/constants/driverPreferences.js; the
// frontend cannot import it (separate package), so this reads the same
// two fields the same tolerant way: what it understands, nothing else.

export function driverRequests(preferences) {
  const p = preferences && typeof preferences === 'object' && !Array.isArray(preferences) ? preferences : {}
  const cities = (Array.isArray(p.avoidCities) ? p.avoidCities : [])
    .filter((c) => c && typeof c.city === 'string' && typeof c.state === 'string')
    .map((c) => `${c.city}, ${c.state.toUpperCase()}`)
  const states = (Array.isArray(p.avoidStates) ? p.avoidStates : [])
    .filter((s) => typeof s === 'string' && s.trim() !== '')
    .map((s) => s.trim().toUpperCase())
  const places = [...cities, ...states]
  if (places.length === 0) return null
  return {
    places: places.join(', '),
    why: typeof p.why === 'string' && p.why.trim() !== '' ? p.why.trim() : null,
  }
}
