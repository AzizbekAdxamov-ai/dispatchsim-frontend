// Which ways of taking a load back apply to this load. Two different things:
// unassigning the driver (the load stays booked with the broker) and
// cancelling the booking (the broker is told, the load is cancelled).
// Pure, so it can be tested without a page.

// Statuses of a load that is on the road with a driver on it.
export const DISPATCHED_STATUSES = Object.freeze(['ontime', 'warn', 'crit'])
// Statuses where the booking is over and cannot be cancelled any more.
export const CLOSED_STATUSES = Object.freeze(['done', 'cancelled'])

export function takeBackOptions(load) {
  if (!load) return { unassign: false, cancelBooking: false }
  const hasThread = Boolean(load.brokerThreadAvailable || load.brokerConversationId)
  return {
    unassign: Boolean(load.driver) && DISPATCHED_STATUSES.includes(load.status),
    cancelBooking: hasThread && !CLOSED_STATUSES.includes(load.status),
  }
}
