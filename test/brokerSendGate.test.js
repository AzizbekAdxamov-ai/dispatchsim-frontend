import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { canSendBrokerMessage, BOOKED_BAR_COPY } from '../src/components/brokerChat/sendGate.js'

// Kills: the send box staying locked on a booked thread (the old status === 'booked' lock)
test('a booked thread can send; a blocked one cannot; empty text cannot', () => {
  assert.equal(canSendBrokerMessage({ sending: false, text: 'truck broke down', blocked: false }), true)
  assert.equal(canSendBrokerMessage({ sending: false, text: 'hello', blocked: true }), false)
  assert.equal(canSendBrokerMessage({ sending: false, text: '   ', blocked: false }), false)
  assert.equal(canSendBrokerMessage({ sending: true, text: 'hello', blocked: false }), false)
})

// Kills: the gate reading the conversation status again
test('the gate has no status input at all', async () => {
  const source = await readFile(new URL('../src/components/brokerChat/sendGate.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source.split('export const BOOKED_BAR_COPY')[0].replace(/\/\/.*$/gm, ''), /status/)
})

// Kills: a stage with no bar wording (a load in transit showing the "accepted" bar)
test('every load stage has its own bar wording', () => {
  for (const stage of ['booked', 'in_transit', 'delivered', 'cancelled']) assert.ok(BOOKED_BAR_COPY[stage], stage)
  assert.notEqual(BOOKED_BAR_COPY.in_transit, BOOKED_BAR_COPY.booked)
})

// Kills: BrokerChat.jsx keeping the booked lock on the button or the send guard
test('BrokerChat.jsx no longer locks on booked and uses the gate', async () => {
  const source = await readFile(new URL('../src/pages/BrokerChat.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /convo\?\.status === 'booked'\s*\)\s*return/)
  assert.doesNotMatch(source, /messageText\.trim\(\) \|\| convo\?\.status === 'booked'/)
  assert.match(source, /canSendBrokerMessage\(/)
})

// Kills: the load page keeping the "out of scope" placeholder instead of linking to the thread
test('LoadDetail.jsx links to the broker thread and drops the placeholder', async () => {
  const source = await readFile(new URL('../src/pages/LoadDetail.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /out of scope/i)
  assert.doesNotMatch(source, /No messages yet/)
  assert.match(source, /\/broker-chat\?load=/)
})
