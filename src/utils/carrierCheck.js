// What to say when the broker will not agree or send paper because the MC
// the dispatcher gave is missing or is not theirs (CARRIER_NOT_VERIFIED).
//
// The server composes the sentence in the broker's own voice
// ("Devin: \"That MC doesn't come up on my end...\"") and ships it in
// details.message. Showing it as it is keeps the refusal a thing a person
// said, and never a silent failure. Same shape as chatLimitMessage.

export function carrierCheckMessage(err) {
  if (err?.code !== 'CARRIER_NOT_VERIFIED') return null

  const fromServer = err?.details?.message
  if (typeof fromServer === 'string' && fromServer.trim() !== '') return fromServer

  // details are stripped in some deployments; the catalog line is the floor.
  return err?.message || 'The broker will not send a rate confirmation until your MC checks out.'
}
