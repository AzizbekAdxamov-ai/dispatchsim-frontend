// Thin layer over api/client.js for /broker-chat.
// Backend is dispatcher-only (requireRole('dispatcher')).
import { api } from './client'

export function listConversations(signal) {
  return api.get('/broker-chat', { auth: true, signal })
}

export function openConversation(postingId, signal) {
  return api.post(`/broker-chat/postings/${encodeURIComponent(postingId)}`, {}, { auth: true, signal })
}

// The thread behind a booked load (from the load page).
export function openLoadConversation(loadId, signal) {
  return api.post(`/broker-chat/loads/${encodeURIComponent(loadId)}`, {}, { auth: true, signal })
}

// The thread itself. Polled while a conversation is open, because a broker
// reply is written the moment you send but only becomes visible when it
// comes due — see replyTiming.js on the server.
export function getThread(conversationId, signal) {
  return api.get(`/broker-chat/${encodeURIComponent(conversationId)}`, { auth: true, signal })
}

export function sendMessage(conversationId, text, signal) {
  return api.post(`/broker-chat/${encodeURIComponent(conversationId)}/messages`, { text }, { auth: true, signal })
}

// Sign the rate confirmation. This is what creates a load — there is no
// booking button on the board any more.
export function acceptRateCon(conversationId, signal) {
  return api.post(`/broker-chat/${encodeURIComponent(conversationId)}/accept`, {}, { auth: true, signal })
}

// Binary responses use the shared client's auth, network and API error handling.
export async function downloadRateConfirmation(conversationId) {
  const blob = await api.blob(
    `/broker-chat/${encodeURIComponent(conversationId)}/rate-confirmation.pdf`,
    { auth: true },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rate-confirmation-${conversationId.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Cancel the booking with the broker from the load page. Irreversible: the
// broker is told, the rate con is voided and the load is cancelled.
export function cancelBookingForLoad(loadId, signal) {
  return api.post(`/broker-chat/loads/${encodeURIComponent(loadId)}/cancel`, {}, { auth: true, signal })
}
