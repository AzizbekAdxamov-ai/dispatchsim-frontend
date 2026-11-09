// Every sentence "Assign truck" / "Unassign truck" shows. A component takes
// this as its `copy` prop, so the words live in one place and a page that
// needs different words passes its own.
import { formatMoney } from '../../utils/format.js'

export const ASSIGN_TRUCK_COPY = Object.freeze({
  assign: 'Assign truck',
  choose: 'Choose a truck…',
  noneAssignable: 'No truck can be assigned right now',
  loading: 'Loading trucks…',
  loadFailed: 'Trucks could not load',
  fleetFull: 'Every truck in the fleet already has a driver.',
  confirm: 'Assign',
  confirming: 'Assigning…',
  cancel: 'Cancel',
  // Said before the click, not discovered on the bill.
  leaseNote: (weeklyUsd) => `Lease ${formatMoney(weeklyUsd)}/week starts when assigned`,
  unassign: 'Unassign truck',
  unassigning: 'Unassigning…',
  unassignNote: 'Lease stops when the truck is unassigned',
})
