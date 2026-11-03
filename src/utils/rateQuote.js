// rateUsd is always the total. Never infer a fuel charge from a market
// benchmark or show private components on a call-for-rate posting.
export const RATE_LABELS = Object.freeze({
  rate: 'Rate',
  total: 'Total',
  totalRate: 'Total rate',
  totalRpm: 'Total rate per mile',
  linehaul: 'Linehaul',
  fuel: 'Fuel surcharge',
  split: 'Linehaul + fuel',
  call: 'Call for rate',
})

export function rateQuote(value) {
  const totalUsd = !value?.rateHidden && typeof value?.rateUsd === 'number' && Number.isFinite(value.rateUsd) && value.rateUsd >= 0
    ? value.rateUsd : null
  const fuel = value?.fuelSurchargeUsd
  const split = totalUsd != null && value?.rateBasis === 'linehaul-plus-fuel'
    && Number.isInteger(fuel) && fuel > 0 && fuel < totalUsd
  return {
    totalUsd,
    split,
    linehaulUsd: split ? totalUsd - fuel : null,
    fuelSurchargeUsd: split ? fuel : null,
  }
}
