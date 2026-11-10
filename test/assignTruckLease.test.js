// "Assign truck" says what the lease costs before the click, names what each
// truck pulls, and explains why an unassign was refused.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ASSIGN_TRUCK_COPY } from '../src/components/drivers/assignTruckCopy.js'
import { TRUCK_LEASE_COPY } from '../src/components/finance/truckLeaseCopy.js'
import { truckOptionLabel, leaseNoteFor, unassignErrorText } from '../src/components/drivers/truckOptions.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const read = (file) => readFileSync(join(root, file), 'utf8')
const BANNED = /\b(simulations?|simulator|simulated|scenarios?|scores?|training|tests?|testing)\b/i
const labelFor = (key) => ({ 'dry-van': 'Dry Van', reefer: 'Reefer' })[key]

// Kills: the lease price missing from the assign step, or hardcoded outside the copy
test('a leased truck shows "Lease $X/week starts when assigned"; an owned one shows nothing', () => {
  const leased = { id: 'TX-5101-DV', leaseWeeklyUsd: 1050 }
  assert.equal(leaseNoteFor(leased, ASSIGN_TRUCK_COPY), 'Lease $1,050/week starts when assigned')
  assert.equal(leaseNoteFor({ id: 'X', leaseWeeklyUsd: null }, ASSIGN_TRUCK_COPY), null)
  assert.equal(leaseNoteFor(undefined, ASSIGN_TRUCK_COPY), null)
  assert.equal(leaseNoteFor(leased, { ...ASSIGN_TRUCK_COPY, leaseNote: (n) => `rent ${n}` }), 'rent 1050')
})

// Kills: the option list hiding the equipment (key shown as a label, or no length)
test('a truck option names its equipment label and trailer length', () => {
  const label = truckOptionLabel({ id: 'CA-5201-RF', equipmentType: 'reefer', trailerLengthFt: 53, year: 2022, make: 'Volvo', model: 'VNL 760', locationCity: 'Fresno', locationState: 'CA' }, labelFor)
  assert.equal(label, "CA-5201-RF · Reefer 53' · 2022 Volvo VNL 760 · Fresno, CA")
  assert.equal(truckOptionLabel({ id: 'OLD-1', year: 2020, make: 'Mack', model: 'Anthem' }), 'OLD-1 · 2020 Mack Anthem')
})

// Kills: a refused unassign shown as a generic failure
test('an unassign on a truck with a load says so', () => {
  assert.match(unassignErrorText('TRUCK_HAS_ACTIVE_LOAD'), /on a load/)
  assert.match(unassignErrorText('DRIVER_HAS_NO_TRUCK'), /no truck/)
  assert.equal(unassignErrorText('OTHER', 'Server said no'), 'Server said no')
})

// Kills: words the product never shows, and sentences hardcoded in the panels
test('the copy has no banned words and the panels read it from props', () => {
  for (const copy of [ASSIGN_TRUCK_COPY, TRUCK_LEASE_COPY]) {
    for (const value of Object.values(copy)) {
      const text = typeof value === 'function' ? value(1050) : value
      assert.ok(!BANNED.test(text), text)
    }
  }
  const panel = read('components/drivers/AssignTruckPanel.jsx')
  assert.match(panel, /copy = ASSIGN_TRUCK_COPY/)
  assert.ok(!panel.includes('Choose a truck'))
  assert.ok(!panel.includes('Assigning…'))
  assert.match(read('components/drivers/UnassignTruckButton.jsx'), /copy\.unassign/)
  assert.match(read('pages/DriverDetail.jsx'), /<UnassignTruckButton driverId=\{driver\.id\}/)
})

// Kills: lease spending invisible in the ledger, the expense tabs or the overview
test('the ledger, expenses and overview know the truck lease', () => {
  assert.match(read('pages/CashLedger.jsx'), /truck_lease: 'Truck lease'/)
  assert.match(read('data/financeData.js'), /truck_lease: \{ label: 'Truck lease'/)
  assert.match(read('pages/FinanceExpenses.jsx'), /truck_lease: Truck,/)
  assert.match(read('pages/FinanceDashboard.jsx'), /<TruckLeaseTable rows=\{overview\.truckLease/)
  assert.match(read('api/drivers.js'), /api\.del\(`\/drivers\/\$\{encodeURIComponent\(id\)\}\/truck`/)
})
