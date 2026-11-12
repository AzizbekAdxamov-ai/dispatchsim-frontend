import { test } from 'node:test'
import assert from 'node:assert/strict'
import { driverChatPath, contactState, draftForIntent } from '../src/utils/driverContact.js'
import { CALL_DRAFT, CONTACT_INTENT, CONTACT_DISABLED } from '../src/data/driverContact.js'

// Kills: building the chat link without encoding the id (a crafted id could add parameters).
test('the chat path encodes the driver id and adds the intent only when given', () => {
  assert.equal(driverChatPath('d1001'), '/driver-chat?driver=d1001')
  assert.equal(driverChatPath('d1001', CONTACT_INTENT.call), '/driver-chat?driver=d1001&intent=call')
  assert.equal(driverChatPath('a&b=c'), '/driver-chat?driver=a%26b%3Dc')
})

// Kills: enabling Call / Message for a truck with nobody in it.
test('no driver means disabled with the no-driver reason', () => {
  assert.deepEqual(contactState(null), { disabled: true, reason: CONTACT_DISABLED.noDriver })
  assert.deepEqual(contactState(undefined), { disabled: true, reason: CONTACT_DISABLED.noDriver })
})

// Kills: letting the dispatcher message someone who already quit, on either page shape.
test('a driver who has left is disabled with the left reason', () => {
  assert.deepEqual(contactState({ employment: { hasLeft: true } }), { disabled: true, reason: CONTACT_DISABLED.hasLeft })
  assert.deepEqual(contactState({ hasLeft: true }), { disabled: true, reason: CONTACT_DISABLED.hasLeft })
})

// Kills: disabling the buttons for a working driver.
test('a working driver is enabled', () => {
  assert.equal(contactState({ employment: { hasLeft: false } }).disabled, false)
  assert.equal(contactState({ hasLeft: false }).disabled, false)
  assert.equal(contactState({}).disabled, false)
})

// Kills: Message pre-filling the call line, or Call leaving the box empty.
test('only the call intent drafts a line', () => {
  assert.equal(draftForIntent(CONTACT_INTENT.call), CALL_DRAFT)
  assert.equal(draftForIntent(null), '')
  assert.equal(draftForIntent('anything-else'), '')
})
