// The Academy entrance plays only when someone walks in from elsewhere, once
// per tab in full, shorter after that, and never on refresh or back/forward.
//
// Kills: playing on refresh/POP/inside the academy; losing the storage keys;
// dropping the hard cap, the hidden-tab stop, or the AudioContext close.
//
// node:test cannot import JSX, so the component is read as source text.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  SEEN_KEY, MUTE_KEY, HARD_CAP_MS, FULL_MS, SHORT_WAIT_MS, REDUCED_MIN_MS, REDUCED_FADE_MS, OUT_MS,
  isAcademyPath, shouldDropIntro, shouldPlayIntro, pickMode, readFlag, writeFlag,
} from '../src/components/academy/academyIntroLogic.js'
import {
  signalAcademyReady, subscribeAcademyReady, academyReadySince,
} from '../src/components/academy/academyIntroSignal.js'

const src = readFileSync(new URL('../src/components/academy/AcademyIntro.jsx', import.meta.url), 'utf8')

test('isAcademyPath matches the section only', () => {
  assert.equal(isAcademyPath('/academy'), true)
  assert.equal(isAcademyPath('/academy/settings'), true)
  assert.equal(isAcademyPath('/academyx'), false)
  assert.equal(isAcademyPath('/'), false)
})

test('shouldPlayIntro', () => {
  const go = (prevPath, nextPath, navigationType) => shouldPlayIntro({ prevPath, nextPath, navigationType })
  assert.equal(go(null, '/academy', 'POP'), false)
  assert.equal(go(null, '/academy', 'PUSH'), false)
  assert.equal(go('/academy', '/academy/settings', 'PUSH'), false)
  assert.equal(go('/', '/academy', 'POP'), false)
  assert.equal(go('/', '/academy', 'PUSH'), true)
  assert.equal(go('/hr', '/academy/settings', 'PUSH'), true)
  assert.equal(go('/', '/loads', 'PUSH'), false)
})

test('shouldDropIntro removes the overlay once the route leaves the academy', () => {
  assert.equal(shouldDropIntro('/login'), true)
  assert.equal(shouldDropIntro('/'), true)
  assert.equal(shouldDropIntro('/academy'), false)
  assert.equal(shouldDropIntro('/academy/lesson/1'), false)
})

test('pickMode', () => {
  assert.equal(pickMode({ seen: false, reducedMotion: false }), 'full')
  assert.equal(pickMode({ seen: true, reducedMotion: false }), 'short')
  assert.equal(pickMode({ seen: false, reducedMotion: true }), 'reduced')
  assert.equal(pickMode({ seen: true, reducedMotion: true }), 'reduced')
})

test('keys and timings', () => {
  assert.equal(SEEN_KEY, 'gm.intro.seen')
  assert.equal(MUTE_KEY, 'gm.intro.mute')
  assert.deepEqual([HARD_CAP_MS, FULL_MS, SHORT_WAIT_MS, REDUCED_MIN_MS, REDUCED_FADE_MS, OUT_MS], [6000, 3300, 1200, 250, 150, 550])
})

test('flags survive a storage that throws', () => {
  const bad = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
  assert.equal(readFlag(bad, 'k'), false)
  assert.doesNotThrow(() => writeFlag(bad, 'k', true))
  assert.equal(readFlag(null, 'k'), false)
  const map = new Map()
  const ok = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) }
  writeFlag(ok, 'k', true)
  assert.equal(readFlag(ok, 'k'), true)
  writeFlag(ok, 'k', false)
  assert.equal(readFlag(ok, 'k'), false)
})

test('ready signal keeps a signal that came before the overlay asked', () => {
  const before = performance.now()
  let hits = 0
  const off = subscribeAcademyReady(() => { hits++ })
  signalAcademyReady()
  assert.equal(hits, 1)
  assert.equal(academyReadySince(before), true)
  assert.equal(academyReadySince(performance.now() + 1000), false)
  off()
  signalAcademyReady()
  assert.equal(hits, 1)
})

test('overlay source keeps its safety nets', () => {
  for (const needle of ['createPortal', 'cancelAnimationFrame', 'visibilitychange', 'aria-hidden', 'aria-live', '.close(', 'HARD_CAP_MS']) {
    assert.ok(src.includes(needle), `AcademyIntro.jsx lost ${needle}`)
  }
})
