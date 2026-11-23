// Leaving a lesson fires a last progress upload while the course list asks the
// server for the same rows. The read must wait for that upload.
//
// Kills: a list that shows 0/7 because its GET overtook the PUT; a failed
// upload blocking the list forever.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settleSaves, trackSave } from '../src/data/academyPending.js'

test('settleSaves resolves at once when nothing is in flight', async () => {
  await settleSaves()
})

test('settleSaves waits for an upload that is still running', async () => {
  let release
  const save = trackSave(new Promise((r) => { release = r }))
  let settled = false
  const waiting = settleSaves().then(() => { settled = true })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(settled, false)
  release('ok')
  await save
  await waiting
  assert.equal(settled, true)
})

test('a failed upload does not block the read and is forgotten', async () => {
  const save = trackSave(Promise.reject(new Error('offline')))
  save.catch(() => {})
  await settleSaves()
  await settleSaves()
})
