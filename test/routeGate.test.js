// Kills: a plain student or cohort member reaching the mentor class screen;
// the route losing its requireMentor flag.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeRedirect } from '../src/components/routeGate.js'

test('loading and anonymous', () => {
  assert.equal(routeRedirect({ status: 'loading' }), 'wait')
  assert.equal(routeRedirect({ status: 'anonymous' }), '/login')
})

test('requireMentor', () => {
  const base = { status: 'authenticated', requireMentor: true }
  assert.equal(routeRedirect({ ...base, user: { roles: ['dispatcher'] } }), '/academy')
  assert.equal(routeRedirect({ ...base, user: { academyAccess: true } }), '/academy')
  assert.equal(routeRedirect({ ...base, user: { isMentor: true } }), null)
  assert.equal(routeRedirect({ ...base, user: { isAdmin: true } }), null)
})

test('requireAdmin and allow', () => {
  assert.equal(routeRedirect({ status: 'authenticated', user: { isMentor: true }, requireAdmin: true }), '/')
  assert.equal(routeRedirect({ status: 'authenticated', user: { roles: ['hr'] }, allow: ['finance'] }), '/')
  assert.equal(routeRedirect({ status: 'authenticated', user: { roles: ['hr'] }, allow: ['hr'] }), null)
})

test('class route requires a mentor', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/academy\/class\/:no" element=\{<ProtectedRoute requireMentor>/)
})
