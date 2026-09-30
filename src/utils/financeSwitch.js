// Is the money model running?
//
// The server answers this on GET /cash (cash.service.js's getOverview,
// from the backend's FINANCE setting). The top bar asks before drawing the
// balance: with the model off nothing accrues against the account and
// nothing is refused because of it, so the number next to the buttons that
// spend it would state a consequence that is not coming.
//
// Only an explicit `false` hides it. A payload that does not carry the
// field at all -- an older server, a response shaped by something else --
// means "not answered", and the balance stays visible. Guessing the other
// way would make the number this chip exists to keep in front of people
// disappear for a reason nobody could see.
export function financeOff(overview) {
  return overview?.financeEnabled === false
}
