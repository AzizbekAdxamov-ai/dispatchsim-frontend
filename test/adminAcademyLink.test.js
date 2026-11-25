// Kills: the admin sidebar losing its Academy entry; the /admin route
// losing requireAdmin so a plain user could open the admin panel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeRedirect } from '../src/components/routeGate.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('admin sidebar has an Academy entry pointing at /academy', () => {
  const src = read('../src/components/layout/AdminShell.jsx')
  const line = src.split('\n').find((l) => l.includes("to: '/academy'"))
  assert.ok(line, 'no /academy entry in ADMIN_NAV_ITEMS')
  assert.match(line, /icon: GraduationCap/)
  assert.match(line, /label: 'Academy'/)
  assert.match(src, /import \{[^}]*GraduationCap[^}]*\} from '@phosphor-icons\/react'/)
})

test('the admin panel stays admin-only', () => {
  const app = read('../src/App.jsx')
  assert.match(app, /path="\/admin"\s*element=\{\s*<ProtectedRoute requireAdmin>\s*<AdminShell \/>/)
  const base = { status: 'authenticated', requireAdmin: true }
  assert.equal(routeRedirect({ ...base, user: { roles: ['dispatcher'] } }), '/')
  assert.equal(routeRedirect({ ...base, user: { roles: ['dispatcher'], academyAccess: true } }), '/')
  assert.equal(routeRedirect({ ...base, user: { isMentor: true } }), '/')
  assert.equal(routeRedirect({ ...base, user: { isAdmin: true } }), null)
})

test('admins and mentors see the Mentor entry in the Academy sidebar', () => {
  const src = read('../src/components/layout/AcademyShell.jsx')
  assert.match(src, /\{ to: '\/academy\/mentor', icon: UsersThree, label: 'Mentor' \}/)
  assert.match(src, /const isMentor = user\?\.isMentor \|\| user\?\.isAdmin/)
  assert.match(src, /\.\.\.\(isMentor \? MENTOR_NAV : \[\]\)/)
})
