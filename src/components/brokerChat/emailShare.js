export const BROKER_EMAIL_COPY = {
  share: 'Share email',
  sharing: 'Sending…',
  paperPending: 'Paperwork on its way',
  message: (email) => `Please send the rate confirmation to ${email}.`,
}

// Sharing is a normal dispatcher message, only after the broker asks.
export function emailShareText(conversation, carrier, copy = BROKER_EMAIL_COPY, awaitingReply = false) {
  // The stage is persisted before the delayed email question becomes visible.
  if (awaitingReply) return null
  if (conversation?.negotiationStage !== 'awaiting_email' || conversation?.status === 'booked') return null
  const email = carrier?.effectiveEmail?.trim()
  return email ? copy.message(email) : null
}
