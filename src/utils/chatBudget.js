// What to say when a message will not send because the day's model
// requests are gone.
//
// One place, because two screens ask it: the broker chat and the driver
// chat spend from one budget, so they have to explain it the same way. Two
// copies would drift, and the student would learn that the rule depends on
// which conversation they happen to be in.
//
// Both screens used to say "Daily message limit reached. It resets
// tomorrow." That sentence is true and it answers nothing. Two different
// things stop a send -- the account is out of requests, or four classmates
// logged on and everyone's share shrank -- and a student who cannot tell
// them apart cannot do anything about either. The server ships the
// arithmetic (CODES_WITH_PUBLIC_DETAILS); this renders it.

export function chatLimitMessage(err) {
  if (err?.code !== 'CHAT_DAILY_LIMIT') return null

  // The server composes the sentence, because the server is where the
  // numbers are. Rebuilding it here from the parts would be a second
  // wording of one fact.
  const fromServer = err?.details?.message
  if (typeof fromServer === 'string' && fromServer.trim() !== '') return fromServer

  // details are stripped in some deployments. The generic line is the
  // floor, not the intent.
  return err?.message || 'Bugungi xabar limiti tugadi. Ertaga yangilanadi.'
}
