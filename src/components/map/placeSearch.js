// Finding a place on the map by typing its name.
//
// Azizbek, 2026-09-30: "I do not really know where the US states and
// cities are". A dispatcher who reads "Dover, DE -> Peoria, IL" and cannot
// picture either end cannot judge the run -- so the Map page gets a box:
// type a city or a state, the map goes there.
//
// Searched over what the app already has, not an outside geocoder: the
// cities the dispatch network uses (the map reference the page already
// loads) and the 48 states plus DC (STATE_BOUNDS, generated from the same
// Census geometry the map draws). No request leaves for a third party,
// nothing is rate-limited, and a city found here is a city a load can
// actually run to. What is NOT here -- a town outside the network -- is
// said out loud by the page, not quietly missing.
//
// Pure. No React, no MapLibre: node:test imports it directly.

// Lower-case, accents off, punctuation to spaces. "Coeur d'Alene",
// "coeur dalene" and "COEUR D ALENE" should all find the same place.
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// One searchable list out of the two sources. Cities carry their state's
// full name as a second line, because "Portland, OR" and "Portland, ME"
// are the kind of pair this search exists to tell apart.
export function buildPlaceIndex({ cities = [], states = [] }) {
  const stateName = new Map(states.map((s) => [s.abbr, s.name]))
  const stateEntries = states.map((s) => ({
    kind: 'state',
    key: `state:${s.abbr}`,
    label: s.name,
    sub: `${s.abbr} · state`,
    bbox: s.bbox,
    name: normalize(s.name),
    abbr: s.abbr.toLowerCase(),
  }))
  const cityEntries = cities
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map((c) => ({
      kind: 'city',
      key: `city:${c.city}:${c.state}`,
      label: `${c.city}, ${c.state}`,
      sub: stateName.get(c.state) ?? c.state,
      lat: c.lat,
      lon: c.lon,
      name: normalize(c.city),
      abbr: String(c.state).toLowerCase(),
      stateName: normalize(stateName.get(c.state) ?? ''),
    }))
  return [...stateEntries, ...cityEntries]
}

// How well one entry matches. Lower is better; null is no match.
//   0  the whole name, or a state's two-letter code, exactly
//   1  the name starts with what was typed
//   2  a later word of the name starts with it ("york" -> New York)
//   3  it appears inside the name
function score(entry, q) {
  if (entry.name === q) return 0
  if (entry.kind === 'state' && entry.abbr === q) return 0
  if (entry.name.startsWith(q)) return 1
  if (entry.name.split(' ').some((word) => word.startsWith(q))) return 2
  if (q.length >= 3 && entry.name.includes(q)) return 3
  return null
}

// "dover de", "dover, de", "dover delaware": a city narrowed by its
// state, written the way an address is. Returns null when the last word
// is not a state, so "new york" is still searched as one name.
function splitCityState(q, states) {
  const words = q.split(' ')
  if (words.length < 2) return null
  for (let take = Math.min(2, words.length - 1); take >= 1; take -= 1) {
    const tail = words.slice(-take).join(' ')
    const head = words.slice(0, -take).join(' ')
    if (!head) continue
    if (states.some((s) => s.abbr === tail || s.name === tail)) return { head, tail }
  }
  return null
}

export function searchPlaces(query, index, limit = 8) {
  const q = normalize(query)
  if (!q) return []

  const states = index.filter((e) => e.kind === 'state')
  const pair = splitCityState(q, states)
  if (pair) {
    const narrowed = index
      .filter((e) => e.kind === 'city' && (e.abbr === pair.tail || e.stateName === pair.tail))
      .map((e) => ({ e, s: score(e, pair.head) }))
      .filter((m) => m.s != null)
    if (narrowed.length > 0) return rank(narrowed, limit)
  }

  return rank(index.map((e) => ({ e, s: score(e, q) })).filter((m) => m.s != null), limit)
}

// Best score first; on a tie a state before a city (typing "georgia"
// wants the state, not a Georgia-named town), then alphabetical so the
// list does not reshuffle between keystrokes.
function rank(matches, limit) {
  return matches
    .sort((a, b) => a.s - b.s
      || (a.e.kind === b.e.kind ? 0 : a.e.kind === 'state' ? -1 : 1)
      || a.e.label.localeCompare(b.e.label))
    .slice(0, limit)
    .map((m) => m.e)
}
