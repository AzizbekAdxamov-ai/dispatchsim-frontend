// What to say when the lender declines.
//
// One place, because three screens ask the same question: booking a load,
// hiring a driver and buying a truck all commit money, and all three now
// get the same two refusals from the server. Three copies of this wording
// would drift, and the student would learn that the rule depends on which
// page they are standing on.
//
// The server sends the numbers with the error (CODES_WITH_PUBLIC_DETAILS),
// so these read as a statement of the company's position rather than as
// "declined" with the reason removed.

function usd(n) {
  return `$${Math.abs(n ?? 0).toLocaleString('en-US')}`
}

export function standingMessage(err) {
  const d = err?.details
  if (err?.code === 'CREDIT_LINE_EXHAUSTED') {
    return `The ${usd(d?.creditLimitUsd)} credit line is used up — the balance is `
      + `-${usd(d?.balanceUsd)}, ${usd(d?.overLimitUsd)} past it. `
      + (d?.receivablesUsd > 0
        ? `${usd(d.receivablesUsd)} is owed to you on delivered loads; the line frees up as that comes in.`
        : 'Nothing is owed to you on delivered loads, so nothing is coming in to free it up.')
  }
  if (err?.code === 'COMPANY_INSOLVENT') {
    return `The company is insolvent: it owes ${usd(d?.liabilitiesUsd)} against `
      + `${usd(d?.assetsUsd)} of trucks and receivables. `
      + 'Loads already in transit still finish and their invoices are still collected.'
  }
  return null
}
