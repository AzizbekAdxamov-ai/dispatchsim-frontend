// The lesson files write JSON-encoded values under "ds-l<N>-<key>"; this pins
// the reader, the merge with the server copy and the mode encoding.
//
// Kills: reading a raw string where JSON is stored; a server row erasing a
// local result; mode written unencoded (the lesson would parse it wrong).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readLessonState, hydrateFromServer, writeMode, stateKey, ensureStorageOwner, clearLessonKeys } from '../src/data/academyStorage.js'

function memory(seed = {}) {
  const m = new Map(Object.entries(seed))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), get length() { return m.size }, key: (i) => [...m.keys()][i] ?? null, dump: () => Object.fromEntries(m) }
}

test('reads JSON-encoded checkpoints, results and mode', () => {
  const s = memory({ 'ds-l3-done': '{"story":true,"hos":false}', 'ds-l3-qz': '6', 'ds-l3-mode': '"teach"' })
  assert.deepEqual(readLessonState(3, s), { exitsDone: { story: true }, quiz: { qz: 6 }, mode: 'teach' })
})

test('broken values fall back to empty state', () => {
  const s = memory({ 'ds-l1-done': '{oops', 'ds-l1-qz': 'x' })
  assert.deepEqual(readLessonState(1, s), { exitsDone: {}, quiz: {}, mode: 'self' })
})

test('hydrate unions checkpoints and keeps a local result', () => {
  const s = memory({ 'ds-l2-done': '{"story":true}', 'ds-l2-qz': '5' })
  const out = hydrateFromServer(2, { exitsDone: { roles: true }, quiz: { qz: 8, exa: 4 }, mode: 'teach' }, s)
  assert.deepEqual(out.exitsDone, { story: true, roles: true })
  assert.equal(out.quiz.qz, 5)
  assert.equal(out.quiz.exa, 4)
  assert.equal(out.mode, 'teach')
})

test('mode is stored JSON-encoded', () => {
  const s = memory()
  writeMode(4, 'teach', s)
  assert.equal(s.dump()['ds-l4-mode'], '"teach"')
})

test('stateKey ignores key order', () => {
  const a = { exitsDone: { a: true, b: true }, quiz: { qz: 1 }, mode: 'self' }
  const b = { exitsDone: { b: true, a: true }, quiz: { qz: 1 }, mode: 'self' }
  assert.equal(stateKey(a), stateKey(b))
})

test('a different owner wipes every lesson key, not unrelated ones', () => {
  const s = memory({
    'ds-academy-owner': 'A', 'ds-l1-done': '{"a":true}', 'ds-l10-qz': '5', 'ds-l12-mode': '"teach"',
    'ds-l13-qz': '1', 'ds-lang': '"en"', 'dispatchsim.token': 'x',
  })
  ensureStorageOwner('B', s)
  assert.deepEqual(s.dump(), { 'ds-academy-owner': 'B', 'ds-l13-qz': '1', 'ds-lang': '"en"', 'dispatchsim.token': 'x' })
})

test('the same owner keeps progress; a first visit records the owner', () => {
  const s = memory({ 'ds-academy-owner': 'A', 'ds-l1-qz': '7' })
  ensureStorageOwner('A', s)
  assert.equal(s.getItem('ds-l1-qz'), '7')
  const fresh = memory({ 'ds-l2-qz': '3' })
  ensureStorageOwner('A', fresh)
  assert.equal(fresh.getItem('ds-l2-qz'), null)
  assert.equal(fresh.getItem('ds-academy-owner'), 'A')
})

test('clearLessonKeys on logout also drops the owner mark', () => {
  const s = memory({ 'ds-academy-owner': 'A', 'ds-l3-done': '{}', other: '1' })
  clearLessonKeys(s, { includeOwner: true })
  assert.deepEqual(s.dump(), { other: '1' })
})
