// Thin layer over api/client.js for password changes and admin resets.
import { api } from './client'

export function changePassword(body) {
  return api.post('/auth/password', body, { auth: true })
}

export function resetUserPassword(id) {
  return api.post(`/admin/users/${encodeURIComponent(id)}/reset-password`, {}, { auth: true })
}
