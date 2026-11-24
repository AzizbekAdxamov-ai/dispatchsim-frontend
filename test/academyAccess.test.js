// Kills: a role-only user seeing the Academy; a changed invite-only text;
// the pages or the sidebar bypassing the shared access helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACADEMY_COPY, hasAcademyAccess, canTeachClass, academyLoadError } from '../src/data/academyAccess.js'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('hasAcademyAccess', () => {
  assert.equal(hasAcademyAccess({ academyAccess: true }), true)
  assert.equal(hasAcademyAccess({ isMentor: true }), true)
  assert.equal(hasAcademyAccess({ isAdmin: true }), true)
  assert.equal(hasAcademyAccess({ roles: ['dispatcher'] }), false)
  assert.equal(hasAcademyAccess({ academyAccess: false }), false)
  assert.equal(hasAcademyAccess(null), false)
})

test('canTeachClass is mentor or admin only', () => {
  assert.equal(canTeachClass({ isMentor: true }), true)
  assert.equal(canTeachClass({ isAdmin: true }), true)
  assert.equal(canTeachClass({ academyAccess: true }), false)
  assert.equal(canTeachClass(undefined), false)
})

test('academyLoadError', () => {
  assert.equal(academyLoadError({ code: 'FORBIDDEN' }), 'forbidden')
  assert.equal(academyLoadError({ code: 'NETWORK' }), 'failed')
  assert.equal(academyLoadError(null), 'failed')
})

test('invite-only copy', () => {
  assert.equal(ACADEMY_COPY.inviteOnly, 'Academy faqat taklif qilingan o‘quvchilar uchun')
})

test('pages and shell use the shared helpers', () => {
  assert.match(read('pages/academy/AcademyHome.jsx'), /ACADEMY_COPY\.inviteOnly/)
  assert.match(read('pages/academy/AcademyLesson.jsx'), /ACADEMY_COPY\.inviteOnly/)
  assert.match(read('components/layout/AppShell.jsx'), /hasAcademyAccess\(user\)/)
})
