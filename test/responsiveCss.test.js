// The sidebar's CSS has to carry the same two breakpoints the JS does, and
// the saved collapse choice keeps its key. Read as text: node:test cannot
// import CSS or JSX.
//
// Kills: dropping the rail or drawer media query from Sidebar.css; renaming
// 'ds.sidebar.collapsed' (every user's saved choice would be lost); the
// scroll lock class losing its rule.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('Sidebar.css has the rail (1099) and drawer (767) queries', () => {
  const css = read('components/layout/Sidebar.css')
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1099px\)/)
  assert.match(css, /@media \(max-width: 767\.98px\)/)
  assert.match(css, /html\.ds-scroll-locked/)
})

test('Sidebar.jsx keeps the saved-choice key and never reads the old 700px fallback', () => {
  const jsx = read('components/layout/Sidebar.jsx')
  assert.match(jsx, /'ds\.sidebar\.collapsed'/)
  assert.doesNotMatch(jsx, /max-width: 700px/)
})

test('every shell page frame comes from Shell.css, not inline padding', () => {
  for (const name of ['AppShell', 'AdminShell', 'AcademyShell', 'FleetShell', 'FinanceShell', 'HrShell']) {
    const jsx = read(`components/layout/${name}.jsx`)
    assert.doesNotMatch(jsx, /className="content"[^>]*style=/, name)
    assert.match(jsx, /SidebarProvider/, name)
  }
  const css = read('components/layout/Shell.css')
  assert.match(css, /\.content\s*\{[^}]*padding: 20px 24px 60px/)
})
