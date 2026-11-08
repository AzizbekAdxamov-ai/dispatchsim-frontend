// Whether the message box can send. Reads only what a send needs: nothing
// in flight, something typed, and a broker who has not blocked the thread.
// The conversation status is deliberately not an input: a booked thread
// stays open for trouble on the road and payment talk.
export function canSendBrokerMessage({ sending = false, text = '', blocked = false } = {}) {
  return !sending && !blocked && String(text).trim().length > 0
}

// The bar above the message box on a booked thread, by where the load is.
export const BOOKED_BAR_COPY = Object.freeze({
  booked: 'Accepted — the load is on the board.',
  in_transit: 'On the road — tell the broker about delays or problems here.',
  delivered: 'Delivered — payment questions are answered here.',
  cancelled: 'This load was cancelled.',
})
