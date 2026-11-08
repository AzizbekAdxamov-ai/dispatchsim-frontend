// The two-step cancel-booking confirm and its error wording. Each test names
// the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { confirmStep, CONFIRM_ACTIONS, takeBackErrorText } from '../src/components/loads/takeBackConfirm.js'

const TAKE_BACK_COPY = { deliveredError: 'delivered', notCancellableError: 'not cancellable', cancelError: 'c', unassignError: 'u' }
const IDLE = { confirming: false }

// Kills: the first "Cancel booking" press calling the cancel at once
test('the first press only opens the confirm, it never fires', () => {
  const next = confirmStep(IDLE, CONFIRM_ACTIONS.OPEN)
  assert.deepEqual(next, { confirming: true, fire: false })
})

// Kills: "Confirm cancel" not firing after the confirm is open
test('Confirm cancel fires once the confirm is open', () => {
  const open = confirmStep(IDLE, CONFIRM_ACTIONS.OPEN)
  assert.equal(confirmStep(open, CONFIRM_ACTIONS.CONFIRM).fire, true)
})

// Kills: Confirm firing without the first step (stale click on a hidden row)
test('Confirm without an open confirm does not fire', () => {
  assert.equal(confirmStep(IDLE, CONFIRM_ACTIONS.CONFIRM).fire, false)
})

// Kills: Keep booking leaving the confirm open or firing
test('Keep booking closes the confirm and does not fire', () => {
  const open = confirmStep(IDLE, CONFIRM_ACTIONS.OPEN)
  assert.deepEqual(confirmStep(open, CONFIRM_ACTIONS.KEEP), { confirming: false, fire: false })
})

// Kills: a delivered-load error on the booking cancel saying "already delivered" (wrong for cancel)
test('LOAD_NOT_CANCELLABLE reads differently for unassign and cancel', () => {
  const copy = TAKE_BACK_COPY
  assert.equal(takeBackErrorText({ kind: 'unassign', code: 'LOAD_NOT_CANCELLABLE', copy }), copy.deliveredError)
  assert.equal(takeBackErrorText({ kind: 'cancel', code: 'LOAD_NOT_CANCELLABLE', copy }), copy.notCancellableError)
})

// Kills: the server's message being swallowed, or a stale BROKER_BLOCKED-only wording coming back
test('other errors keep their message, with a fallback when there is none', () => {
  const copy = TAKE_BACK_COPY
  assert.equal(takeBackErrorText({ kind: 'cancel', code: 'BROKER_BLOCKED', message: 'boom', copy }), 'boom')
  assert.equal(takeBackErrorText({ kind: 'cancel', code: 'X', copy }), copy.cancelError)
  assert.equal(takeBackErrorText({ kind: 'unassign', code: 'X', copy }), copy.unassignError)
})
