// The Map page's search box: type a city or a state, find it.
// Each test names the mutation it kills. No React, no MapLibre.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { normalize, buildPlaceIndex, searchPlaces } from '../src/components/map/placeSearch.js'
import { STATE_BOUNDS } from '../src/data/usMap.js'

const CITIES = [
  { city: 'Dover', state: 'DE', lat: 39.1582, lon: -75.5244 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.797 },
  { city: 'Portland', state: 'OR', lat: 45.5152, lon: -122.6784 },
  { city: 'Portland', state: 'ME', lat: 43.6591, lon: -70.2568 },
  { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.006 },
  { city: 'Peoria', state: 'IL', lat: 40.6936, lon: -89.589 },
  // Contains "den" without starting with it, and sorts before Denver
  // alphabetically: the only way the ranking of prefix over substring
  // shows up at all.
  { city: 'Camden', state: 'NJ', lat: 39.9259, lon: -75.1196 },
]
const INDEX = buildPlaceIndex({ cities: CITIES, states: STATE_BOUNDS })
const labels = (q) => searchPlaces(q, INDEX).map((p) => p.label)

// -- the states the search is built on ------------------------------------

// Kills: a generator that drops a state or ships one without its code.
// Forty-eight states and DC, each with the USPS code the rest of the app
// speaks in.
test('every state of the lower 48, and DC, with its two-letter code', () => {
  assert.equal(STATE_BOUNDS.length, 49)
  assert.equal(new Set(STATE_BOUNDS.map((s) => s.abbr)).size, 49)
  assert.ok(STATE_BOUNDS.every((s) => /^[A-Z]{2}$/.test(s.abbr)))
})

// Kills: bounds taken from the wrong geometry, or lat and lon swapped.
// Dallas is in Texas; the box that says "Texas" has to contain it.
test('a state\'s box holds its own cities', () => {
  const tx = STATE_BOUNDS.find((s) => s.abbr === 'TX')
  const [minLon, minLat, maxLon, maxLat] = tx.bbox
  assert.ok(minLon < -96.797 && -96.797 < maxLon, 'Dallas uzunlikda Texas qutisida emas')
  assert.ok(minLat < 32.7767 && 32.7767 < maxLat, 'Dallas kenglikda Texas qutisida emas')
})

// -- finding things ---------------------------------------------------------

// Kills: substring-first ranking. "den" is Denver before anything that
// merely contains the letters.
test('what you start typing comes first', () => {
  assert.equal(labels('den')[0], 'Denver, CO')
  assert.equal(labels('peo')[0], 'Peoria, IL')
})

// Kills: states searchable only by full name. The postings say "TX".
test('a state is found by its name and by its two letters', () => {
  assert.equal(labels('texas')[0], 'Texas')
  assert.equal(labels('tx')[0], 'Texas')
  assert.equal(labels('del')[0], 'Delaware')
})

// Kills: ignoring the state in "city, ST". Two Portlands; the one asked
// for is the one that comes back.
test('"city, state" picks the city in that state', () => {
  assert.deepEqual(labels('portland me'), ['Portland, ME'])
  assert.deepEqual(labels('Portland, OR'), ['Portland, OR'])
  assert.deepEqual(labels('dover delaware'), ['Dover, DE'])
  // Both, when the state is not given -- and each says which state.
  const both = searchPlaces('portland', INDEX)
  assert.deepEqual(both.map((p) => p.sub).sort(), ['Maine', 'Oregon'])
})

// Kills: treating "new york" as city "new" in state "york". A two-word
// name is still a name when its last word is not a state.
test('a two-word city is still one name', () => {
  assert.equal(labels('new york')[0], 'New York')
  assert.ok(labels('new york').includes('New York, NY'))
})

// Kills: case, accents or punctuation deciding whether something is found.
test('typing is forgiving', () => {
  assert.equal(normalize('Española'), 'espanola')
  assert.equal(normalize("  Coeur d'Alene "), 'coeur d alene')
  assert.equal(normalize('St. Louis'), 'st louis')
  assert.equal(labels('DENVER')[0], 'Denver, CO')
  assert.equal(labels('  dover,,  ')[0], 'Dover, DE')
})

// Kills: returning everything for nothing, or something for nonsense.
test('nothing typed, nothing found; nonsense, nothing found', () => {
  assert.deepEqual(searchPlaces('', INDEX), [])
  assert.deepEqual(searchPlaces('   ', INDEX), [])
  assert.deepEqual(searchPlaces('zzqx', INDEX), [])
})

// Kills: a city entry without a place to go, or a state without a box.
test('a city carries its point, a state its box', () => {
  const [dover] = searchPlaces('dover', INDEX)
  assert.equal(dover.kind, 'city')
  assert.equal(dover.lat, 39.1582)
  const [tx] = searchPlaces('tx', INDEX)
  assert.equal(tx.kind, 'state')
  assert.equal(tx.bbox.length, 4)
})
