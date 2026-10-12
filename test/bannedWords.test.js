// The words the product never shows (project rule): Simulation, Scenario,
// Score, Training, Test -- the student is dispatching, not being tested.
// 2026-10-08 audit found "while the simulator runs" on the Fleet alerts
// page. This reads every string and every piece of JSX text in src.
//
// Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const BANNED = /\b(simulations?|simulator|simulated|scenarios?|scores?|training|tests?|testing)\b/i

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : /\.jsx?$/.test(name) ? [p] : []
  })
}

// What a person can read: quoted strings and the text between JSX tags.
// Comments are stripped first; object keys and identifiers are not text.
export function visibleText(code) {
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
  const out = []
  // ${...} inside a template string is code, not text.
  for (const m of noComments.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) out.push(m[2].replace(/\$\{[^}]*\}/g, ''))
  for (const m of noComments.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push(m[1])
  return out
}

// Kills: the reader missing JSX text or strings (a check that reads
// nothing passes everything).
test('the reader finds strings and JSX text, and skips comments', () => {
  const t = visibleText(`// a Score comment\nconst a = 'Fleet Score'\nreturn <p>Your training</p>`)
  assert.ok(t.includes('Fleet Score'))
  assert.ok(t.includes('Your training'))
  assert.ok(!t.some((s) => /comment/.test(s)))
})

// Kills: a banned word anywhere a person can read it.
test('no banned word in any string or JSX text', () => {
  const found = []
  for (const f of files(src)) {
    for (const s of visibleText(readFileSync(f, 'utf8'))) {
      if (BANNED.test(s)) found.push(`${relative(src, f)}: ${s.trim().slice(0, 80)}`)
    }
  }
  assert.deepEqual(found, [])
})
