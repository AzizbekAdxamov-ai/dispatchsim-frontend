// The workspace picker left the top bar: it is a list of buttons on the
// Settings pages now (the bar is one 52px row and has no room to spare).
// Read as text: node:test cannot import JSX.
//
// Kills: the picker coming back into the bar; a Settings page that no longer
// offers the switch; the old "top bar" instruction surviving in the copy.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('the top bar does not render the workspace picker', () => {
  const jsx = read('components/layout/Topbar.jsx')
  assert.doesNotMatch(jsx, /WorkspaceSwitcher/)
  assert.doesNotMatch(read('components/layout/Topbar.css'), /workspace-switcher/)
})

test('all three Settings pages offer it', () => {
  for (const page of ['Settings', 'FleetSettings', 'FinanceSettings']) {
    assert.match(read(`pages/${page}.jsx`), /import WorkspaceSwitcher from/, page)
    assert.match(read(`pages/${page}.jsx`), /<WorkspaceSwitcher \/>/, page)
  }
})

test('the Settings copy no longer points at the top bar', () => {
  assert.doesNotMatch(read('pages/Settings.jsx'), /top bar/i)
})

test('the switcher is a button group with a pressed state, 40px tall', () => {
  const jsx = read('components/layout/WorkspaceSwitcher.jsx')
  assert.match(jsx, /role="group"/)
  assert.match(jsx, /aria-pressed=\{key === user\.activeRole\}/)
  assert.match(jsx, /if \(!user \|\| user\.roles\.length < 2\) return null/)
  assert.match(jsx, /roleHomePath\(key\)/)
  assert.match(read('components/layout/WorkspaceSwitcher.css'), /min-height: 40px/)
})
