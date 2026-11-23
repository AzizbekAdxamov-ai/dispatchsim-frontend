// Leaving a lesson fires a last progress upload while the course list asks the
// server for the same rows. The read must wait for that upload, but never for
// longer than the cap.
//
// Kills: a list that shows 0/7 because its GET overtook the PUT; a failed
// upload blocking the list; a hung upload blocking it forever; a finished
// upload left in the pending set.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendingCount, readAfterSaves, settleSaves, trackSave } from '../src/data/academyPending.js'

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms))

test('settleSaves resolves at once when nothing is in flight', async () => {
  assert.equal(pendingCount(), 0)
  await settleSaves()
})

test('settleSaves waits for an upload that is still running', async () => {
  let release
  const save = trackSave(new Promise((r) => { release = r }))
  assert.equal(pendingCount(), 1)
  let settled = false
  const waiting = settleSaves().then(() => { settled = true })
  await tick()
  assert.equal(settled, false)
  release('ok')
  await save
  await waiting
  assert.equal(settled, true)
  assert.equal(pendingCount(), 0)
})

test('a failed upload does not block the read and leaves the pending set', async () => {
  const save = trackSave(Promise.reject(new Error('offline')))
  save.catch(() => {})
  await settleSaves()
  await tick()
  assert.equal(pendingCount(), 0)
})

test('the GET is issued only after the save in flight has settled', async () => {
  const calls = []
  let release
  const save = trackSave(new Promise((r) => { release = r }))
  save.then(() => calls.push('save settled'))
  const read = readAfterSaves(() => { calls.push('GET'); return 'rows' }, 5000)
  await tick()
  assert.deepEqual(calls, [])
  release()
  assert.equal(await read, 'rows')
  assert.deepEqual(calls, ['save settled', 'GET'])
})

// Last on purpose: the hung upload stays in the pending set for the rest of the file.
test('a never-settling upload holds the read for the cap only', async () => {
  trackSave(new Promise(() => {}))
  const started = Date.now()
  await settleSaves(60)
  const waited = Date.now() - started
  assert.ok(waited >= 50, `returned too early: ${waited}ms`)
  assert.ok(waited < 1000, `blocked past the cap: ${waited}ms`)
})
