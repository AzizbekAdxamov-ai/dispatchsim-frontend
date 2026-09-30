// The store behind the "live data stopped updating" notice.
//
// This is the piece that decides whether a failing poll is ever seen at
// all, so it gets the same treatment as the backend's pure modules: real
// assertions, each naming the mutation it kills. It imports nothing but
// itself, so node runs it directly -- no browser, no React.

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'

// Date.now() has millisecond resolution, and two calls in a row land in
// the same millisecond -- so the two tests below that are ABOUT time
// have to let a millisecond pass, or they pass whether the code keeps
// the original timestamp or overwrites it. Both mutations survived until
// this sleep was here.
const TICK = 5

import {
  reportPoll, forgetPoll, snapshot, subscribePollHealth, resetPollHealth,
} from '../src/hooks/pollHealth.js'

beforeEach(() => resetPollHealth())

test('a clean app reports nothing', () => {
  const s = snapshot()
  assert.equal(s.failingCount, 0)
  assert.equal(s.message, null)
  assert.equal(s.since, null)
})

test('a failed poll is counted and carries its own reason', () => {
  // Kills: the catch that kept the data and said nothing -- the exact
  // behaviour this store was added to replace.
  reportPoll('a', new Error('Network request failed'))
  const s = snapshot()
  assert.equal(s.failingCount, 1)
  assert.equal(s.message, 'Network request failed')
  assert.ok(s.since > 0)
})

test('a poll that keeps failing keeps the time it started failing', async () => {
  // Kills: `since` refreshed on every tick, which would make a
  // four-minute outage read as three seconds old, forever.
  reportPoll('a', new Error('boom'))
  const first = snapshot().since
  await sleep(TICK)
  reportPoll('a', new Error('boom again'))
  const second = snapshot()
  assert.equal(second.since, first)
  assert.equal(second.failingCount, 1, 'the same screen must not be counted twice')
  assert.equal(second.message, 'boom again', 'the latest reason is the one shown')
})

test('the oldest failure is the one the notice ages from', async () => {
  reportPoll('a', new Error('first'))
  const firstSince = snapshot().since
  await sleep(TICK)
  reportPoll('b', new Error('second'))
  const s = snapshot()
  assert.equal(s.failingCount, 2)
  // Kills: `since` taken from whichever entry happens to be last.
  assert.equal(s.since, firstSince)
})

test('a successful poll clears that screen and records when data last arrived', () => {
  reportPoll('a', new Error('boom'))
  reportPoll('b', new Error('boom'))
  reportPoll('a', null)
  const s = snapshot()
  assert.equal(s.failingCount, 1, 'only the recovered screen clears')
  assert.ok(s.lastOkAt > 0)
})

test('a screen that unmounts stops being a failing screen', () => {
  // Kills: forgetPoll left out of the unmount path -- the notice would
  // then name a page the user closed and never go away.
  reportPoll('a', new Error('boom'))
  forgetPoll('a')
  assert.equal(snapshot().failingCount, 0)
})

test('an unchanged store hands back the same snapshot object', () => {
  // useSyncExternalStore compares snapshots by reference and re-renders
  // whenever they differ. A getSnapshot that built a fresh object on
  // every read would differ on every read and loop forever, so the
  // snapshot is built on change and handed out by reference.
  //
  // Kills: snapshot() going back to building its object per call.
  const a = snapshot()
  assert.equal(snapshot(), a, 'a quiet store must return the identical object')

  reportPoll('x', new Error('boom'))
  const b = snapshot()
  assert.notEqual(b, a, 'a real change must produce a new object')
  assert.equal(snapshot(), b)

  reportPoll('x', null)
  assert.notEqual(snapshot(), b)
})

test('subscribers hear about changes, and only about changes', () => {
  const seen = []
  const off = subscribePollHealth((s) => seen.push(s.failingCount))
  reportPoll('a', new Error('boom'))
  reportPoll('a', null)
  const afterRealChanges = seen.length
  // A healthy poll on an already-healthy screen happens every few
  // seconds on every page. Kills: emitting on those too, which would
  // re-render the shell on every tick of every poll in the app.
  reportPoll('a', null)
  reportPoll('a', null)
  assert.equal(seen.length, afterRealChanges)
  off()
  reportPoll('a', new Error('boom'))
  assert.equal(seen.length, afterRealChanges, 'unsubscribed and still listening')
})
