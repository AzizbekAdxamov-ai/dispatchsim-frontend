import { test } from 'node:test'
import assert from 'node:assert/strict'
import { passwordFormProblem, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../src/utils/passwordRules.js'

const CURRENT = 'current-pass'
const pad = (n) => 'a'.repeat(n)

// Kills: a client bound different from the server's 8..72 (7 and 73 must fail, 8 and 72 pass).
test('the new password is checked at the 8 and 72 edges', () => {
  assert.equal(passwordFormProblem({ current: CURRENT, next: pad(PASSWORD_MIN_LENGTH - 1) }), 'tooShort')
  assert.equal(passwordFormProblem({ current: CURRENT, next: pad(PASSWORD_MIN_LENGTH) }), null)
  assert.equal(passwordFormProblem({ current: CURRENT, next: pad(PASSWORD_MAX_LENGTH) }), null)
  assert.equal(passwordFormProblem({ current: CURRENT, next: pad(PASSWORD_MAX_LENGTH + 1) }), 'tooLong')
})

// Kills: sending the form with no current password.
test('an empty current password is a problem', () => {
  assert.equal(passwordFormProblem({ current: '', next: pad(PASSWORD_MIN_LENGTH) }), 'missingCurrent')
})

// Kills: allowing the new password to equal the current one.
test('the same password is a problem', () => {
  const same = pad(PASSWORD_MIN_LENGTH)
  assert.equal(passwordFormProblem({ current: same, next: same }), 'same')
})

// Kills: the bounds drifting away from the backend constants.
test('the bounds match the backend constants', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8)
  assert.equal(PASSWORD_MAX_LENGTH, 72)
})
