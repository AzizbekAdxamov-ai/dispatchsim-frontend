import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invoiceAction } from '../src/utils/invoiceActions.js'
import { INVOICE_ACTION_DISABLED } from '../src/data/invoiceActionCopy.js'

const SENT = '2026-11-01T00:00:00Z'
const inv = (extra) => ({ status: 'open', sentAt: null, canRemindBroker: true, ...extra })

// Kills: letting a draft invoice (load not delivered) be sent.
test('a draft shows Send, disabled, with the delivery reason', () => {
  assert.deepEqual(invoiceAction(inv({ status: 'draft' })), {
    kind: 'send', disabled: true, reason: INVOICE_ACTION_DISABLED.notDelivered,
  })
})

// Kills: hiding Send for an invoice that has not gone out yet.
test('an unsent open or overdue invoice shows an enabled Send', () => {
  assert.deepEqual(invoiceAction(inv({ status: 'open' })), { kind: 'send', disabled: false, reason: undefined })
  assert.deepEqual(invoiceAction(inv({ status: 'overdue' })), { kind: 'send', disabled: false, reason: undefined })
})

// Kills: the old behavior, a "Send reminder" button on every non-draft invoice (paid shows Send reminder).
test('a paid invoice shows no action (never Send reminder)', () => {
  assert.equal(invoiceAction(inv({ status: 'paid', sentAt: SENT })).kind, null)
  assert.equal(invoiceAction(inv({ status: 'paid', sentAt: null })).kind, null)
})

// Kills: offering a reminder before the invoice is overdue.
test('a sent invoice that is not yet due shows no action', () => {
  assert.equal(invoiceAction(inv({ status: 'open', sentAt: SENT })).kind, null)
})

// Kills: a reminder button that is missing or disabled for the dispatcher who booked the load.
test('a sent overdue invoice shows an enabled reminder', () => {
  assert.deepEqual(invoiceAction(inv({ status: 'overdue', sentAt: SENT })), {
    kind: 'remind', disabled: false, reason: undefined,
  })
})

// Kills: a reminder enabled for someone with no broker thread on the load.
test('a reminder is disabled when the viewer did not book the load', () => {
  assert.deepEqual(invoiceAction(inv({ status: 'overdue', sentAt: SENT, canRemindBroker: false })), {
    kind: 'remind', disabled: true, reason: INVOICE_ACTION_DISABLED.notYourBroker,
  })
})

// Kills: a crash while the invoice has not loaded.
test('no invoice means no action', () => {
  assert.equal(invoiceAction(null).kind, null)
})
