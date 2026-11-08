// The company-calendar footnotes read one shared phrase. Each test names
// the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { COMPANY_DAY_PHRASE, COMPANY_DAY_REAL_MINUTES } from '../src/data/companyClock.js'

const PAGES = ['ComplianceOverview', 'DispatchBoard', 'DriverHos', 'DriverQualification']

// Kills: the footnote still saying the old two-minute day.
test('the company day is described as thirty minutes, not two', () => {
  assert.equal(COMPANY_DAY_REAL_MINUTES, 30)
  assert.match(COMPANY_DAY_PHRASE, /thirty minutes/)
  assert.doesNotMatch(COMPANY_DAY_PHRASE, /two minutes/)
})

// Kills: a page hardcoding its own copy of the sentence again (drift).
test('every footnote page reads the shared phrase and hardcodes none', () => {
  for (const name of PAGES) {
    const src = readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), 'utf8')
    assert.ok(src.includes('{COMPANY_DAY_PHRASE}'), `${name} uses the constant`)
    assert.doesNotMatch(src, /every two minutes/i, `${name} has no stale copy`)
  }
})
