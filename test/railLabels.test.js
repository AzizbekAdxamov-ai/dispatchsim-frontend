// The collapsed rail is 60px wide and prints each entry's name under its
// icon on one line. A label longer than RAIL_LABEL_MAX characters does not
// fit ("Compliance" and "Documents" were clipped at 10px type) -- it needs a
// shortLabel.
//
// Kills: dropping a shortLabel (or adding a long label without one) in any
// shell's nav; raising RAIL_LABEL_MAX without re-measuring the rail.
//
// node:test cannot import JSX, so the four flat-list shells are read as
// source text: every `{ to: ..., label: ..., shortLabel?: ... }` line.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  DISPATCH_SECTIONS, DISPATCH_SETTINGS, RAIL_LABEL_MAX, railLabel,
} from '../src/components/layout/navSections.js'

const SHELLS = ['FleetShell', 'HrShell', 'FinanceShell', 'AdminShell']

function shellItems(name) {
  const src = readFileSync(new URL(`../src/components/layout/${name}.jsx`, import.meta.url), 'utf8')
  return src
    .split('\n')
    .filter((line) => line.includes("to: '") && line.includes("label: '"))
    .map((line) => ({
      label: /label: '([^']+)'/.exec(line)[1],
      shortLabel: /shortLabel: '([^']+)'/.exec(line)?.[1],
    }))
}

const all = [
  ...DISPATCH_SECTIONS.map((s) => ({ where: `dispatch/${s.id}`, label: s.label, shortLabel: s.shortLabel })),
  { where: 'dispatch/settings', ...DISPATCH_SETTINGS },
  ...SHELLS.flatMap((n) => shellItems(n).map((i) => ({ where: n, ...i }))),
  { where: 'Sidebar/admin', label: 'Administration', shortLabel: 'Admin' },
]

test('every shell nav was found', () => {
  for (const n of SHELLS) assert.ok(shellItems(n).length >= 2, n)
})

test('every rail label fits the 60px rail', () => {
  for (const item of all) {
    const shown = railLabel(item)
    assert.ok(shown.length <= RAIL_LABEL_MAX, `${item.where}: "${shown}" is ${shown.length} chars`)
  }
})

test('railLabel falls back to the full label', () => {
  assert.equal(railLabel({ label: 'Alerts' }), 'Alerts')
  assert.equal(railLabel({ label: 'Maintenance', shortLabel: 'Service' }), 'Service')
})
