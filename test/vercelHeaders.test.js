// Security headers served with the SPA (app rule) and the static lesson pages
// (course rule). The CSP is the one that matters:
// a loosened script-src turns any HTML injection into account takeover
// (the session token lives in localStorage).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const BACKEND_ORIGIN = 'https://dispatchsim-backend.vercel.app'
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))

const APP = '/((?!course/).*)'
const COURSE = '/course/(.*)'

function headersFor(source) {
  const rule = (config.headers ?? []).find((h) => h.source === source)
  assert.ok(rule, `no headers rule for ${source}`)
  return Object.fromEntries(rule.headers.map((h) => [h.key, h.value]))
}

function directives(csp) {
  return Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/)
    return [name, values]
  }))
}

// Vercel anchors source patterns; mirror that for the path checks.
const matches = (source, path) => new RegExp(`^${source}$`).test(path)

test('every rule carries the baseline security headers', () => {
  // Kills: removing a header from either rule.
  for (const source of [APP, COURSE]) {
    const h = headersFor(source)
    assert.equal(h['X-Content-Type-Options'], 'nosniff', source)
    assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin', source)
    assert.match(h['Permissions-Policy'], /camera=\(\)/, source)
    assert.match(h['Permissions-Policy'], /geolocation=\(\)/, source)
    assert.match(h['Permissions-Policy'], /microphone=\(\)/, source)
  }
})

test('app rule denies framing and inline/eval script, and allows the API origins', () => {
  const h = headersFor(APP)
  assert.equal(h['X-Frame-Options'], 'DENY')
  const csp = directives(h['Content-Security-Policy'])
  // Kills: dropping frame-ancestors (clickjacking).
  assert.deepEqual(csp['frame-ancestors'], ["'none'"])
  // Kills: adding 'unsafe-inline' or 'unsafe-eval' to script-src.
  assert.ok(csp['script-src'], 'script-src must be explicit')
  assert.ok(!csp['script-src'].includes("'unsafe-inline'"))
  assert.ok(!csp['script-src'].includes("'unsafe-eval'"))
  // Kills: reverting to frame-src 'none' (breaks lesson iframes) or opening external frames.
  assert.deepEqual(csp['frame-src'], ["'self'"])
  // Kills: forgetting the backend origin, which breaks every API call.
  assert.ok(csp['connect-src'].includes("'self'"))
  assert.ok(csp['connect-src'].includes(BACKEND_ORIGIN))
  // Kills: a staging/preview (-git-) backend or a *.vercel.app wildcard sneaking back in.
  const vercelOrigins = csp['connect-src'].filter((v) => /vercel\.app/.test(v))
  assert.deepEqual(vercelOrigins, [BACKEND_ORIGIN])
  assert.ok(!csp['connect-src'].some((v) => v.includes('*')))
  // Kills: opening object/base-uri/form-action.
  assert.deepEqual(csp['object-src'], ["'none'"])
  assert.deepEqual(csp['base-uri'], ["'self'"])
  assert.deepEqual(csp['form-action'], ["'self'"])
})

test('course rule allows same-origin framing and inline lesson scripts only', () => {
  const h = headersFor(COURSE)
  assert.equal(h['X-Frame-Options'], 'SAMEORIGIN')
  const csp = directives(h['Content-Security-Policy'])
  assert.deepEqual(csp['frame-ancestors'], ["'self'"])
  // Kills: dropping inline (lessons break) or adding eval / external script hosts.
  assert.deepEqual(csp['script-src'], ["'self'", "'unsafe-inline'"])
  assert.ok(!csp['script-src'].includes("'unsafe-eval'"))
  // Kills: lessons gaining network access.
  assert.deepEqual(csp['connect-src'], ["'self'"])
  assert.deepEqual(csp['form-action'], ["'none'"])
  assert.deepEqual(csp['object-src'], ["'none'"])
  assert.deepEqual(csp['font-src'], ["'self'"])
})

test('app and course rules never overlap (no double CSP)', () => {
  // Kills: a regression to a catch-all that stacks two CSPs on lesson pages.
  assert.ok(!matches(APP, '/course/lesson-01.html'))
  assert.ok(matches(COURSE, '/course/lesson-01.html'))
  assert.ok(matches(APP, '/login'))
  assert.ok(matches(APP, '/academy/lesson/1'))
  assert.ok(!matches(COURSE, '/login'))
  assert.ok(!matches(COURSE, '/academy/lesson/1'))
})

test('the SPA rewrite is still there', () => {
  // Kills: replacing "rewrites" while adding "headers".
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
})

// Kills: a Google Fonts origin creeping back into the CSP -- fonts are
// self-hosted (brand v1), so no external font origin is needed.
test('CSP allows no external font origin', () => {
  for (const source of [APP, COURSE]) {
    const csp = headersFor(source)['Content-Security-Policy']
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(csp), source)
    assert.deepEqual(directives(csp)['font-src'], ["'self'"], source)
  }
})
