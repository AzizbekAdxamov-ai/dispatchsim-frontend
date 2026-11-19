// Kills: a contrast helper that is off, a token pair that drops below AA
// without a stated reason, and the old cream/blue palette creeping back.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrast, composite, parseTokens, evaluate } from '../scripts/check-contrast.mjs'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'theme', 'tokens.css'), 'utf8')

test('contrast maths', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21)
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.48) < 0.01)
  assert.ok(Math.abs(composite('rgba(255,255,255,0.5)', '#000000').r - 127.5) < 0.01)
})

test('parseTokens reads both themes plus the shared root', () => {
  const t = parseTokens(css)
  assert.equal(t.dark.bg, '#0B1020')
  assert.equal(t.light.bg, '#F7F9FC')
  assert.equal(t.dark.lime, '#B7FF3C')
  assert.equal(t.light.lime, '#B7FF3C')
})

test('every token pair passes AA unless waived with a reason', () => {
  const failed = evaluate(css).filter((r) => r.status === 'FAIL')
  assert.deepEqual(failed.map((r) => `${r.theme} ${r.fg}/${r.bg} ${r.ratio.toFixed(2)}`), [])
})

test('the old cream and blue palette is gone from light', () => {
  const light = css.slice(css.indexOf(':root[data-theme="light"]'))
  for (const hex of ['#F7F2EA', '#FFFDF9', '#F1EAE0', '#EAE1D2', '#E4DACB', '#3A3229', '#635A4D', '#6B6459', '#3B7DD8', '#E4EDFB']) {
    assert.ok(!light.toUpperCase().includes(hex), hex)
  }
})
