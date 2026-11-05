import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emailShareText } from '../src/components/brokerChat/emailShare.js'

test('email is shared only when the negotiated thread asks for it', () => {
  const carrier = { effectiveEmail: 'dispatch@example.com', emailSource: 'account' }
  for (const negotiationStage of ['negotiating', 'held', 'paper_pending', 'paper_delivered', 'booked']) {
    assert.equal(emailShareText({ negotiationStage }, carrier), null)
  }
  assert.equal(emailShareText(null, carrier), null)
  assert.equal(emailShareText({ negotiationStage: 'awaiting_email' }, carrier),
    'Please send the rate confirmation to dispatch@example.com.')
})

test('uses the server effective address for company override or account fallback', () => {
  const convo = { negotiationStage: 'awaiting_email' }
  assert.equal(emailShareText(convo, { email: null, effectiveEmail: 'login@example.com' }),
    'Please send the rate confirmation to login@example.com.')
  assert.equal(emailShareText(convo, { email: 'company@example.com', effectiveEmail: 'company@example.com' }),
    'Please send the rate confirmation to company@example.com.')
  assert.equal(emailShareText(convo, {}), null)
  assert.equal(emailShareText({ ...convo, status: 'booked' }, { effectiveEmail: 'x@example.com' }), null)
})

// Kills exposing the shortcut while the broker email question is still delayed.
test('persisted awaiting_email waits for the broker question to become visible', () => {
  const conversation = { negotiationStage: 'awaiting_email', status: 'agreed' }
  const carrier = { effectiveEmail: 'dispatch@example.com' }
  assert.equal(emailShareText(conversation, carrier, undefined, true), null)
  assert.equal(emailShareText(conversation, carrier, undefined, false),
    'Please send the rate confirmation to dispatch@example.com.')
})
