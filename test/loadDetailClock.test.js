// The load page shows two clocks and must say which is which (2026-10-08:
// "Delivery Oct 8" beside a Trip plan arriving Oct 6, load 600010). The
// appointments are the broker's dates; a dispatched run runs on the
// company clock from the dispatch. Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'pages', 'LoadDetail.jsx'), 'utf8')

// Kills: the bare "Pickup"/"Delivery" labels coming back.
test('the posting dates are labelled as the broker\'s appointments', () => {
  assert.match(page, />Pickup appointment</)
  assert.match(page, />Delivery appointment</)
  assert.doesNotMatch(page, /ld-detail-label">(Pickup|Delivery)</)
})

// Kills: the note dropped, or shown before there is a run to explain.
test('a dispatched load says where the run\'s own times are', () => {
  assert.match(page, /\{load\.dispatchedAt && \(\s*<div className="ld-detail-note">\s*\{RUN_CLOCK_NOTE\}/)
  assert.match(page, /const RUN_CLOCK_NOTE = 'Appointments are the broker\\'s dates\. The run itself is timed from the dispatch on the company clock/)
})
