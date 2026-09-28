// Thin layer over api/client.js for /telegram.
import { api } from './client'

// Is the bridge on for this deployment, and has this account linked a chat.
export function getStatus(signal) {
  return api.get('/telegram/status', { auth: true, signal })
}

// A fresh one-time code, valid 15 minutes.
export function createCode() {
  return api.post('/telegram/codes', {}, { auth: true })
}

// The newest unused code, if one is still live.
export function getActiveCode(signal) {
  return api.get('/telegram/codes', { auth: true, signal })
}

export function unlink() {
  return api.del('/telegram/link', { auth: true })
}
