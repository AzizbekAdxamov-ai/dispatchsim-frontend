// The words the product never shows (Simulation, Scenario, Score, Training,
// Test) must not appear in any text a person can read in the screens and copy
// added with the password, invoice-send and driver-contact work. bannedWords
// covers all of src; this names the new files so a rename cannot drop them.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const FORBIDDEN = /\b(Simulation|Scenario|Score|Training|Test)\b/i

const FILES = [
  'components/settings/ChangePasswordPanel.jsx',
  'components/admin/TempPasswordModal.jsx',
  'components/admin/UserTable.jsx',
  'pages/AdminUsers.jsx',
  'pages/Login.jsx',
  'pages/Settings.jsx',
  'pages/FleetSettings.jsx',
  'pages/FinanceSettings.jsx',
  'pages/InvoiceDetail.jsx',
  'pages/DriverDetail.jsx',
  'pages/TruckDetail.jsx',
  'pages/DriverChat.jsx',
  'pages/Dashboard.jsx',
  'data/passwordCopy.js',
  'data/driverContact.js',
  'data/invoiceActionCopy.js',
  'data/loginFeedback.js',
  'data/academyAccess.js',
  'pages/academy/AcademyHome.jsx',
  'pages/academy/AcademyLesson.jsx',
]

// Text a person can read: quoted strings and the text between JSX tags.
// Comments are removed first; import paths and class-name lists are code, not copy.
function visibleText(code) {
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
  const out = []
  for (const m of noComments.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const text = m[2].replace(/\$\{[^}]*\}/g, '')
    if (/^(\.|\/)/.test(text) || /^[a-z0-9_-]+(\s[a-z0-9_-]+)*$/.test(text)) continue
    out.push(text)
  }
  for (const m of noComments.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push(m[1])
  return out
}

// Kills: a reader that finds nothing (it would pass everything).
test('the reader sees copy and skips code', () => {
  const t = visibleText("import x from '../Test/y.js'\nconst a = 'Your Score'\nconst c = 'test-id'\nreturn <p>Hello there</p>")
  assert.ok(t.includes('Your Score'))
  assert.ok(t.includes('Hello there'))
  assert.ok(!t.some((s) => s.includes('Test/y')))
  assert.ok(!t.includes('test-id'))
})

// Kills: a forbidden word in any text the new screens show.
test('no forbidden word in the new screens and copy', () => {
  const found = []
  for (const file of FILES) {
    for (const text of visibleText(readFileSync(join(src, file), 'utf8'))) {
      if (FORBIDDEN.test(text)) found.push(`${file}: ${text.trim().slice(0, 80)}`)
    }
  }
  assert.deepEqual(found, [])
})
