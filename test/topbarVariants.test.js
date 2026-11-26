// Kills: a workspace's top bar showing links its users would be bounced from;
// the fleet bell pointing at the dispatch alerts board; a shell losing its variant.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { topbarParts } from '../src/components/layout/topbarVariants.js'
import { FLEET_ALERT_FAMILIES } from '../src/data/alertFamilies.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('dispatch shows everything', () => {
  const p = topbarParts('dispatch', ['dispatcher'])
  assert.deepEqual([p.quickLinks, p.clocks, p.cash, p.bell], [true, true, true, true])
  assert.equal(p.cashTo, '/cash')
  assert.equal(p.alertsTo, '/alerts')
  assert.equal(p.families, null)
})

test('fleet: quick links only with the dispatcher role; cash chip is text otherwise', () => {
  const both = topbarParts('fleet', ['fleet-manager', 'dispatcher'])
  assert.equal(both.quickLinks, true)
  assert.equal(both.cashTo, '/cash')
  assert.equal(both.alertsTo, '/fleet/alerts')
  assert.equal(both.families, FLEET_ALERT_FAMILIES)
  const only = topbarParts('fleet', ['fleet-manager'])
  assert.equal(only.quickLinks, false)
  assert.equal(only.cashTo, null)
  assert.equal(only.bell, true)
})

test('finance: clocks and cash only', () => {
  const p = topbarParts('finance', ['finance'])
  assert.deepEqual([p.quickLinks, p.clocks, p.cash, p.bell], [false, true, true, false])
  assert.equal(p.cashTo, '/finance/cashflow')
})

test('minimal and unknown variants show nothing', () => {
  for (const v of ['minimal', undefined, 'nope']) {
    const p = topbarParts(v, ['dispatcher'])
    assert.deepEqual([p.quickLinks, p.clocks, p.cash, p.bell], [false, false, false, false])
  }
})

test('each shell asks for its variant', () => {
  const expected = { AppShell: 'dispatch', FleetShell: 'fleet', FinanceShell: 'finance', HrShell: 'minimal', AdminShell: 'minimal', AcademyShell: 'minimal' }
  for (const [shell, variant] of Object.entries(expected)) {
    assert.match(read(`../src/components/layout/${shell}.jsx`), new RegExp(`<Topbar [^>]*variant="${variant}"`), shell)
  }
})
