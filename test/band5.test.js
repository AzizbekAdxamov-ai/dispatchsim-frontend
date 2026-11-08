import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibleMessages, showTyping } from '../src/utils/chatView.js'
import { boardCountLabel, nextView, boardPager, PAGE_SIZE, MAX_PAGE_LIMIT } from '../src/components/loadboard/boardCount.js'
import { getDriverStatus, driverPlace } from '../src/utils/driverStatus.js'

const NEW_YORK = { city: 'New York', state: 'NY' }

// Kills: a reply with no text drawn as an empty bubble
test('visibleMessages drops blank text but keeps cards and real text', () => {
  const list = [
    { id: 1, kind: 'text', content: 'hi' },
    { id: 2, kind: 'text', content: '   ' },
    { id: 3, kind: 'rate_con', content: '' },
    { id: 4, content: '' },
  ]
  assert.deepEqual(visibleMessages(list).map((m) => m.id), [1, 3])
  assert.deepEqual(visibleMessages(undefined), [])
})

// Kills: no typing line while the message is still being sent
test('showTyping is true while sending or awaiting a reply', () => {
  assert.equal(showTyping({ awaitingReply: false, sending: true }), true)
  assert.equal(showTyping({ awaitingReply: true, sending: false }), true)
  assert.equal(showTyping({ awaitingReply: false, sending: false }), false)
})

// Kills: "48 results" over a 23-row table
test('boardCountLabel says Showing N of M when the table is shorter', () => {
  assert.equal(boardCountLabel({ shown: 23, total: 48 }), 'Showing 23 of 48')
  assert.equal(boardCountLabel({ shown: 48, total: 48 }), '48 results')
  assert.equal(boardCountLabel({ shown: 0, total: 0 }), '0 results')
})

// Kills: Show more asking for a page the server refuses (limit above its ceiling)
test('nextView grows the limit to the ceiling, then pages', () => {
  const grown = nextView({ limit: PAGE_SIZE, page: 1 })
  assert.deepEqual(grown, { limit: MAX_PAGE_LIMIT, page: 1 })
  assert.deepEqual(nextView(grown), { limit: MAX_PAGE_LIMIT, page: 2 })
})

// Kills: a footer that offers more when everything is on screen
test('boardPager knows when there is more and where the rows sit', () => {
  assert.equal(boardPager({ limit: 50, page: 1, total: 48, shown: 48 }).hasMore, false)
  assert.equal(boardPager({ limit: 50, page: 1, total: 80, shown: 50 }).hasMore, true)
  const p2 = boardPager({ limit: 100, page: 2, total: 250, shown: 100 })
  assert.deepEqual([p2.from, p2.to, p2.hasPrev, p2.hasMore], [101, 200, true, true])
})

// Kills: an available driver still shown at the home yard instead of where they are
test('driverStatus names whereNow, not home base', () => {
  const d = { dutyStatus: 'on-duty', homeBaseCity: 'Seattle', homeBaseState: 'WA', whereNow: NEW_YORK }
  assert.equal(getDriverStatus(d).meta, 'Available — New York, NY')
  assert.equal(driverPlace(d), 'New York, NY')
  assert.equal(driverPlace({ homeBaseCity: 'Seattle', homeBaseState: 'WA' }), 'Seattle, WA')
})
