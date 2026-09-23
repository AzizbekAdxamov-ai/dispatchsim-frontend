// Thin layer over api/client.js for /facilities (migration 035): the
// generated fuel stops, truck stops, repair shops and rest areas the map
// draws. Static for the life of a session -- the generator writes them,
// nothing at runtime moves one -- so pages fetch this once and never poll.
import { api } from './client'

export function listFacilities(signal) {
  return api.get('/facilities', { auth: true, signal })
}
