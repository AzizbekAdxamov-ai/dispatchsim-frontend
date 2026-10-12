// The market under a posting, as lines a dispatcher can read -- here so
// node:test can import it (it cannot import JSX).
//
// The numbers arrive from the server (backend/src/constants/
// marketRates.js): DAT's linehaul benchmark for freight leaving the
// origin's region and the destination's region, and the national figure.
// Facts only. Nothing here says whether the load is good: a cheap lane
// INTO a weak market and a rich lane into a strong one are both on the
// board, and telling them apart is the dispatcher's job.

function rpm(v) {
  return `$${Number(v).toFixed(2)}/mi`
}

function shortDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function sideLine(prefix, side) {
  const where = side.region ?? 'this state'
  return {
    label: `${prefix} ${where}`,
    value: rpm(side.linehaul),
    // A region DAT did not list this week prices from the national
    // figure, and saying so is the difference between a fact and a
    // number that only looks like one.
    note: side.source === 'national' ? 'no regional figure this week — national' : null,
  }
}

// Past two weeks the age is printed -- DAT publishes weekly, so an older
// figure has had two newer reports nobody brought in. Mirrors
// backend/src/constants/marketRates.js STALE_AFTER_DAYS.
export const STALE_AFTER_DAYS = 14

function ageDays(weekEnding, now) {
  const end = Date.parse(`${weekEnding}T23:59:59-05:00`)
  return Math.max(0, Math.floor((now.getTime() - end) / 86400000))
}

export function marketLines(market, now = new Date()) {
  if (!market) return null
  const age = ageDays(market.weekEnding, now)
  return {
    heading: `Market · week ending ${shortDate(market.weekEnding)}${age > STALE_AFTER_DAYS ? ` · ${age} days old` : ''}`,
    lines: [
      sideLine('Freight out of', market.origin),
      sideLine('Reload out of', market.destination),
      { label: 'National', value: rpm(market.national), note: null },
    ],
    footnote: `${market.source} linehaul, fuel excluded — a regional average, not a quote for this lane. Board rates include fuel.`,
  }
}
