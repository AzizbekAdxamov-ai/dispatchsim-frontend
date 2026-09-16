// Thin layer over api/client.js for /tracking. Authenticated, any granted
// role — same gating as /loads. The response shape is defined by
// tracking.service.js on the backend: { loads: [...], meta: {...} }.
import { api } from './client'

export function getTrackingBoard(signal) {
  return api.get('/tracking', { auth: true, signal })
}
