// Security headers served with the SPA. The CSP is the one that matters:
// a loosened script-src turns any HTML injection into account takeover
// (the session token lives in localStorage).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const BACKEND_ORIGIN = 'https://dispatchsim-backend.vercel.app'
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))

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

test('every path gets the security headers', () => {
  const h = headersFor('/(.*)')
  // Kills: removing the rule or scoping it to one path.
  assert.equal(h['X-Frame-Options'], 'DENY')
  assert.equal(h['X-Content-Type-Options'], 'nosniff')
  assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.match(h['Permissions-Policy'], /camera=\(\)/)
  assert.match(h['Permissions-Policy'], /geolocation=\(\)/)
  assert.match(h['Permissions-Policy'], /microphone=\(\)/)
})

test('CSP forbids framing and inline/eval script, and allows the API origin', () => {
  const csp = directives(headersFor('/(.*)')['Content-Security-Policy'])
  // Kills: dropping frame-ancestors (clickjacking).
  assert.deepEqual(csp['frame-ancestors'], ["'none'"])
  // Kills: adding 'unsafe-inline' or 'unsafe-eval' to script-src.
  assert.ok(csp['script-src'], 'script-src must be explicit')
  assert.ok(!csp['script-src'].includes("'unsafe-inline'"))
  assert.ok(!csp['script-src'].includes("'unsafe-eval'"))
  // Kills: forgetting the backend origin, which breaks every API call.
  assert.ok(csp['connect-src'].includes(BACKEND_ORIGIN))
  // Kills: opening object/base-uri/form-action.
  assert.deepEqual(csp['object-src'], ["'none'"])
  assert.deepEqual(csp['base-uri'], ["'self'"])
  assert.deepEqual(csp['form-action'], ["'self'"])
})

test('the SPA rewrite is still there', () => {
  // Kills: replacing "rewrites" while adding "headers".
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
})
