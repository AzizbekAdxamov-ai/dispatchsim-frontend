// How a wait is SAID. The backend decides stages on the exact day count;
// this only picks the words, and mirrors the same helper there
// (constants/driverPay.js) so the page and the driver's chat agree.
// Company days are compressed time: a server left running over a weekend
// reads "300 days" for pay that was never really that late.
export function describeWait(days) {
  const n = Math.max(0, Math.floor(Number(days) || 0))
  if (n <= 14) return `${n} ${n === 1 ? 'day' : 'days'}`
  if (n <= 60) return 'a few weeks'
  return 'over two months'
}
