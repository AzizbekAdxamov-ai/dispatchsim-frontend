// "Assign truck" on a driver's page -- the words, tested without React.
// Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { truckOptionLabel, assignErrorText } from '../src/components/drivers/truckOptions.js'

// Kills: a label that loses the plate, or leads with anything else. The
// plate is what gets said on the phone.
test('a truck reads plate first, then what it is, then where it sits', () => {
  assert.equal(
    truckOptionLabel({ id: 'RS-9278-CY', year: 2021, make: 'Freightliner', model: 'Cascadia', locationCity: 'Seattle', locationState: 'WA' }),
    'RS-9278-CY · 2021 Freightliner Cascadia · Seattle, WA',
  )
})

// Kills: printing "undefined" or a dangling separator for a truck with no
// recorded location or spec.
test('missing parts are left out, not printed', () => {
  assert.equal(truckOptionLabel({ id: 'RS-9278-CY', year: 2021, make: 'Freightliner', model: 'Cascadia' }), 'RS-9278-CY · 2021 Freightliner Cascadia')
  assert.equal(truckOptionLabel({ id: 'RS-9278-CY' }), 'RS-9278-CY')
})

// Kills: swallowing what the server said. A code the page does not know
// still has a message from the server, and that message is the fact.
test('a known code gets the page\'s words; an unknown one keeps the server\'s', () => {
  assert.match(assignErrorText('TRUCK_NOT_IDLE', 'x'), /working or in the shop/)
  assert.equal(assignErrorText('SOMETHING_NEW', 'The server said this.'), 'The server said this.')
  assert.equal(assignErrorText(null, undefined), 'The truck was not assigned.')
})
