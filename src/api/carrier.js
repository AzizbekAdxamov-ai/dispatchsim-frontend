// Thin layer over api/client.js for /carrier -- the company's own
// letterhead: the name, the authority numbers and the address that go on
// every rate confirmation and every invoice.
import { api } from './client'

export function getCarrier(signal) {
  return api.get('/carrier', { auth: true, signal })
}

// Administrators only (the server says so too). Send just the fields that
// changed: the update coalesces the rest rather than blanking them.
export function updateCarrier(patch) {
  return api.patch('/carrier', patch, { auth: true })
}
