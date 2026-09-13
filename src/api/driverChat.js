// Thin layer over api/client.js for /driver-chat.
//
// The thread is per DRIVER and never closes — a broker conversation is
// about one posting, a driver is someone you work with for months, and the
// history of what you promised them is the point.
import { api } from './client'

// Every driver on the roster with their last delivered line, whether or
// not a conversation exists yet.
export function listThreads(signal) {
  return api.get('/driver-chat', { auth: true, signal })
}

export function openConversation(driverId, signal) {
  return api.post('/driver-chat', { driverId }, { auth: true, signal })
}

// The thread, plus what this driver is owed. Polled while open, because a
// reply is written the moment you send but only becomes visible when it
// comes due — see driverChat.replyTiming.js on the server.
export function getThread(conversationId, signal) {
  return api.get(`/driver-chat/${encodeURIComponent(conversationId)}`, { auth: true, signal })
}

export function sendMessage(conversationId, text, signal) {
  return api.post(
    `/driver-chat/${encodeURIComponent(conversationId)}/messages`,
    { text },
    { auth: true, signal },
  )
}
