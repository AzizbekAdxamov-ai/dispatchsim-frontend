import { rateQuote } from '../../utils/rateQuote.js'
import { formatMoney } from '../../utils/format.js'

// The wording around the figures on a rate confirmation card. A prop of the
// card so the page owns the text; these are the defaults.
export const RATE_CON_LINE_COPY = Object.freeze({
  allIn: 'all-in',
  total: 'total',
  linehaul: 'linehaul',
  fuel: 'fuel',
})

// What the paper says it pays, from the figures the thread carries on the
// rate confirmation row. null when the row has none (voided, or an older
// document): the card then shows no amount rather than a guess. It never
// compares the figure with the agreed rate; reading that is the dispatcher's job.
export function rateConLine(message, copy = RATE_CON_LINE_COPY) {
  if (!message || message.voidedAt) return null
  const quote = rateQuote({
    rateUsd: message.rateConRateUsd,
    rateBasis: message.rateConBasis,
    fuelSurchargeUsd: message.rateConFuelSurchargeUsd,
  })
  if (quote.totalUsd == null) return null
  if (!quote.split) return `${formatMoney(quote.totalUsd)} ${copy.allIn}`
  return `${formatMoney(quote.totalUsd)} ${copy.total} · ${copy.linehaul} ${formatMoney(quote.linehaulUsd)} + ${copy.fuel} ${formatMoney(quote.fuelSurchargeUsd)}`
}
