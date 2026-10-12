// What the dispatcher pinned down in a broker thread, said back once the
// rate is agreed -- here so node:test can import it (it cannot import JSX).
//
// The facts come from the server (backend/src/constants/freightTerms.js):
// the trade words the dispatcher typed, and which before-booking points
// (appointment, fuel, detention, layover, lumper, tolls, plus temperature
// or securement by trailer) they raised. Shown AFTER agreeing, never
// during: a checklist on screen while negotiating would be the program
// asking the questions for them. Afterwards it is a record of what they
// did, the way a lead dispatcher would read the thread back.
//
// Raised, not settled. Whether the broker's answer was good enough is
// for the person reading it.

function list(items) {
  return items.join(', ')
}

export function talkSummary(talk, status) {
  if (!talk || (status !== 'agreed' && status !== 'booked')) return null
  const raised = talk.confirm.filter((c) => c.raised).map((c) => c.label)
  const notRaised = talk.confirm.filter((c) => !c.raised).map((c) => c.label)
  return {
    raised: raised.length > 0 ? `Raised before agreeing: ${list(raised)}.` : 'Raised before agreeing: none of these.',
    notRaised: notRaised.length > 0 ? `Not raised: ${list(notRaised)}.` : null,
    words: talk.used.length > 0 ? `Trade words you used: ${list(talk.used)}.` : 'Trade words you used: none.',
  }
}
