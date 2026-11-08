// What a chat thread shows, decided in one place for both chats.
//
// A reply with no text is never drawn as an empty bubble (X10,
// 2026-11-08): it is dropped. And the "typing" line shows while the
// dispatcher's own message is still travelling, not only once the server
// has a pending reply row -- between the two the thread used to show the
// dispatcher's line with nothing beside it, which read as being ignored.

const TEXT_KIND = 'text'

export function visibleMessages(messages) {
  return (messages ?? []).filter(
    (m) => !((m.kind ?? TEXT_KIND) === TEXT_KIND && String(m.content ?? '').trim() === ''),
  )
}

export function showTyping({ awaitingReply = false, sending = false } = {}) {
  return Boolean(awaitingReply || sending)
}
