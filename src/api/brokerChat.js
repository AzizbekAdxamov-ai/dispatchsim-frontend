// Thin layer over api/client.js for /broker-chat.
// Backend is dispatcher-only (requireRole('dispatcher')).
import { api, API_BASE, getToken, ApiError } from './client'

export function listConversations(signal) {
  return api.get('/broker-chat', { auth: true, signal })
}

export function openConversation(postingId, signal) {
  return api.post(`/broker-chat/postings/${encodeURIComponent(postingId)}`, {}, { auth: true, signal })
}

export function sendMessage(conversationId, text, signal) {
  return api.post(`/broker-chat/${encodeURIComponent(conversationId)}/messages`, { text }, { auth: true, signal })
}

export function agreeRate(conversationId, rateUsd, signal) {
  return api.post(`/broker-chat/${encodeURIComponent(conversationId)}/agree`, { rateUsd }, { auth: true, signal })
}

// Not routed through api.get: the response is a PDF, not JSON. It still has
// to use the SAME base URL and the SAME token storage as every other call —
// a relative URL lands on the Vite dev server, and the token lives under
// 'dispatchsim.token', not 'token'.
export async function downloadRateConfirmation(conversationId) {
  const res = await fetch(
    `${API_BASE}/broker-chat/${encodeURIComponent(conversationId)}/rate-confirmation.pdf`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.code ?? 'INTERNAL_ERROR', body.message || 'Download failed', res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rate-confirmation-${conversationId.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
