// Kills: a role opening another role's workspace; a denied redirect that
// lands on a page which denies the same user again (a loop); a temporary
// password sending someone to a settings page they cannot open.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeRedirect, homeFor, passwordChangePath } from '../src/components/routeGate.js'
import { canOpenPath } from '../src/components/routeAccess.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

const D = { allow: ['dispatcher'] }
const GUARDS = {
  '/': D, '/loads': D, '/settings': D, '/compliance': D, '/cash': D, '/alerts': D,
  '/fleet': { allow: ['fleet-manager'] },
  '/finance': { allow: ['finance'] },
  '/hr': { allow: ['hr'] }, '/hr/settings': { allow: ['hr'] },
  '/admin': { requireAdmin: true }, '/admin/settings': { requireAdmin: true },
  '/academy': {}, '/academy/settings': {},
  '/academy/mentor': { requireMentor: true },
}

const USERS = {
  dispatcher: { roles: ['dispatcher'], activeRole: 'dispatcher' },
  hr: { roles: ['hr'], activeRole: 'hr' },
  finance: { roles: ['finance'], activeRole: 'finance' },
  fleet: { roles: ['fleet-manager'], activeRole: 'fleet-manager' },
  admin: { isAdmin: true, roles: [], activeRole: null },
  adminDispatcher: { isAdmin: true, roles: ['dispatcher'], activeRole: 'dispatcher' },
  mentor: { isMentor: true, roles: [], activeRole: null },
  multi: { roles: ['dispatcher', 'hr'], activeRole: 'hr' },
}

const go = (user, path) => routeRedirect({ status: 'authenticated', user, ...GUARDS[path] })

test('dispatcher workspace is dispatcher-only', () => {
  assert.equal(go(USERS.dispatcher, '/'), null)
  assert.equal(go(USERS.dispatcher, '/fleet'), '/')
  assert.equal(go(USERS.dispatcher, '/finance'), '/')
  assert.equal(go(USERS.dispatcher, '/hr'), '/')
  assert.equal(go(USERS.dispatcher, '/admin'), '/')
  assert.equal(go(USERS.dispatcher, '/academy'), null)
  assert.equal(go(USERS.dispatcher, '/academy/mentor'), '/academy')
  assert.equal(go(USERS.hr, '/loads'), '/hr')
  assert.equal(go(USERS.hr, '/cash'), '/hr')
  assert.equal(go(USERS.hr, '/hr/settings'), null)
  assert.equal(go(USERS.finance, '/settings'), '/finance')
  assert.equal(go(USERS.fleet, '/alerts'), '/fleet')
  assert.equal(go(USERS.admin, '/'), '/admin')
  assert.equal(go(USERS.admin, '/admin/settings'), null)
  assert.equal(go(USERS.admin, '/academy/mentor'), null)
  assert.equal(go(USERS.adminDispatcher, '/'), null)
  assert.equal(go(USERS.mentor, '/'), '/academy')
  assert.equal(go(USERS.mentor, '/academy'), null)
  assert.equal(go(USERS.mentor, '/academy/settings'), null)
  assert.equal(go(USERS.mentor, '/academy/mentor'), null)
  assert.equal(go(USERS.mentor, '/admin'), '/academy')
  assert.equal(go(USERS.multi, '/'), null)
})

test('a denied redirect never points at the denied path', () => {
  for (const [name, user] of Object.entries(USERS)) {
    for (const path of Object.keys(GUARDS)) {
      const to = go(user, path)
      if (!to) continue
      assert.notEqual(to, path, `${name} -> ${path}`)
      if (to in GUARDS) {
        // One hop must be enough: the target lets this user in.
        assert.equal(go(user, to), null, `${name}: ${path} -> ${to} would bounce again`)
      }
    }
  }
})

test('homeFor', () => {
  assert.equal(homeFor({ roles: [] }), '/pending')
  assert.equal(homeFor({ roles: [], isMentor: true }), '/academy')
  assert.equal(homeFor({ roles: [], academyAccess: true }), '/academy')
  assert.equal(homeFor({ roles: ['finance'], activeRole: null }), '/finance')
  // An unknown role key must land on /pending, which stays put -- no loop.
  assert.equal(homeFor({ roles: ['x'], activeRole: 'x' }), '/pending')
  assert.equal(homeFor({ roles: ['x'], activeRole: null }), '/pending')
  assert.equal(homeFor({ roles: [], isAdmin: true }), '/admin')
  assert.equal(homeFor({ roles: ['hr'], activeRole: 'finance' }), '/hr')
  assert.equal(homeFor({ roles: ['dispatcher', 'hr'], activeRole: 'dispatcher' }), '/')
})

test('passwordChangePath leads to a page the user can open', () => {
  assert.equal(passwordChangePath(USERS.hr), '/hr/settings')
  assert.equal(passwordChangePath(USERS.admin), '/admin/settings')
  assert.equal(passwordChangePath({ roles: [], academyAccess: true }), '/academy/settings')
  assert.equal(passwordChangePath({ roles: [] }), '/pending')
  assert.equal(passwordChangePath(USERS.dispatcher), '/settings')
  assert.equal(passwordChangePath(USERS.finance), '/finance/settings')
  assert.equal(passwordChangePath({ roles: ['finance'], activeRole: null }), '/finance/settings')
  assert.equal(passwordChangePath({ roles: ['x'], activeRole: 'x' }), '/pending')
})

test('App.jsx wires the guards and the settings routes', () => {
  const app = read('../src/App.jsx')
  assert.match(app, /<ProtectedRoute allow=\{\['dispatcher'\]\}>\s*<AppShell \/>/)
  assert.match(app, /path="settings" element=\{<HrSettings \/>\}/)
  assert.match(app, /path="settings" element=\{<AdminSettings \/>\}/)
  assert.match(app, /path="settings" element=\{<AcademySettings \/>\}/)
})

test('canOpenPath follows the same guards', () => {
  assert.equal(canOpenPath(USERS.dispatcher, '/drivers/3'), true)
  assert.equal(canOpenPath(USERS.dispatcher, '/fleet/alerts'), false)
  assert.equal(canOpenPath(USERS.fleet, '/drivers/3'), false)
  assert.equal(canOpenPath(USERS.fleet, '/driver-chat?intent=call'), false)
  assert.equal(canOpenPath(USERS.fleet, '/fleet/trucks/1'), true)
  assert.equal(canOpenPath(USERS.finance, '/loads/9'), false)
  assert.equal(canOpenPath(USERS.finance, '/finance/invoices/2'), true)
  assert.equal(canOpenPath(USERS.hr, '/hr/applicants/4'), true)
  assert.equal(canOpenPath(USERS.hr, '/load-board'), false)
  assert.equal(canOpenPath(USERS.admin, '/admin/invites'), true)
  assert.equal(canOpenPath(USERS.dispatcher, '/admin'), false)
  assert.equal(canOpenPath(USERS.mentor, '/academy/lesson/1'), true)
  assert.equal(canOpenPath(USERS.mentor, '/load-board'), false)
  assert.equal(canOpenPath(USERS.multi, '/loads'), true)
})
