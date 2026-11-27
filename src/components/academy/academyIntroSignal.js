// Readiness bus: Academy pages say "my first content is on screen". The
// overlay compares timestamps, so a signal that fires before the overlay
// subscribes is kept, and one from an earlier visit is ignored.

let readyAt = -Infinity
const subscribers = new Set()

export function signalAcademyReady() {
  readyAt = performance.now()
  subscribers.forEach((cb) => cb())
}

export function subscribeAcademyReady(cb) {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

export function academyReadySince(t) {
  return readyAt >= t
}
