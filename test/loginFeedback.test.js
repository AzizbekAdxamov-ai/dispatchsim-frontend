import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { LOGIN_FEEDBACK, cooldownSeconds } from '../src/data/loginFeedback.js'

const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8')
const start = source.indexOf('  async function handleSubmit(')
const end = source.indexOf('\n  }', start) + 4
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

test('same-tick submits share one request; cooldown retains inputs and expires without retrying', async () => {
  let reject
  let calls = 0
  const pending = new Promise((_resolve, fail) => { reject = fail })
  const inFlight = { current: false }
  const cooldownUntil = { current: 0 }
  const state = { error: '', remaining: 0 }
  class ApiError extends Error { constructor(code, details) { super(code); this.code = code; this.details = details } }
  const env = {
    inFlight, cooldownUntil, email: 'user@example.com', password: 'unchanged', remember: false,
    setError: v => state.error = v, setSubmitting: () => {}, setRemaining: v => state.remaining = v,
    login: (email, password, remember) => { calls++; assert.deepEqual([email, password, remember], ['user@example.com', 'unchanged', false]); return pending },
    navigate: () => {}, roleHomePath: () => '/', ApiError, cooldownSeconds, loginErrorMessage: e => e.message,
    e: { preventDefault() {} },
  }
  const run = () => new AsyncFunction(...Object.keys(env), `return (${source.slice(start, end).trim()})(e)`)(...Object.values(env))
  const first = run()
  await run()
  assert.equal(calls, 1)
  reject(new ApiError('RATE_LIMITED', { retryAfterSeconds: 2 }))
  await first
  assert.equal(state.remaining, 2)
  assert.equal(state.error, '')
  await run()
  assert.equal(calls, 1)
  assert.equal(env.email, 'user@example.com')
  assert.equal(env.password, 'unchanged')
  cooldownUntil.current = Date.now() - 1
  await run()
  assert.equal(calls, 2)
})

test('cooldown is bounded and uses an unambiguous countdown', () => {
  assert.equal(cooldownSeconds({ retryAfterSeconds: -1 }), 900)
  assert.equal(cooldownSeconds({ retryAfterSeconds: 9999 }), 900)
  assert.equal(LOGIN_FEEDBACK.cooldown(65), 'Too many attempts. Try again in 1:05.')
})

test('a closed registration says what to do, in the server\'s words', () => {
  // Kills: dropping the INVITE_REQUIRED line (page falls back to "Something went wrong").
  assert.equal(
    LOGIN_FEEDBACK.inviteRequired,
    'Registration requires an invite code. Ask your administrator for an invite link.',
  )
})
