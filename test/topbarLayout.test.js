// The top bar is one 52px row at every width (--shell-chrome counts it as
// 52), so it sizes itself by its own width and drops things by priority.
// Read as text: node:test cannot import CSS or JSX.
//
// Kills: removing the container (the tiers silently stop applying); the
// quick links losing their accessible name when the label is hidden at
// narrow widths; the hamburger losing its name or its link to the drawer.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../src/components/layout/${p}`, import.meta.url), 'utf8')

test('the bar is a size container, one row, 52px', () => {
  const css = read('Topbar.css')
  assert.match(css, /container-type:\s*inline-size/)
  assert.match(css, /container-name:\s*topbar/)
  assert.match(css, /\.topbar \{[^}]*height: 52px/)
  assert.match(css, /\.topbar \{[^}]*z-index: 30/)
  assert.doesNotMatch(css, /flex-wrap:\s*wrap/)
})

test('the tiers are container queries, not viewport media queries', () => {
  const css = read('Topbar.css')
  for (const px of [1319, 1099, 899, 759, 479]) {
    assert.ok(css.includes(`@container topbar (max-width: ${px}px)`), String(px))
  }
})

test('quick links keep a name when their label is hidden', () => {
  const jsx = read('Topbar.jsx')
  assert.match(jsx, /aria-label=\{label\}/)
  assert.match(jsx, /topbar-link-label/)
})

test('the hamburger names itself and points at the sidebar', () => {
  const jsx = read('Topbar.jsx')
  assert.match(jsx, /topbar-menu-btn/)
  assert.match(jsx, /aria-label=\{copy\.openMenu\}/)
  assert.match(jsx, /aria-controls="app-sidebar"/)
  assert.match(jsx, /aria-expanded=\{drawerOpen\}/)
})
