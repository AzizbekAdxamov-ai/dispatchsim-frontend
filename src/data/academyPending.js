// Progress uploads that are still in flight. Leaving a lesson fires one last
// upload while the course list mounts and asks the server for the same rows;
// without waiting, the list can read the state from before that upload.
// Pure: no storage, no network.

// A hung upload must not hold the list hostage: after this the read goes ahead.
export const SAVE_WAIT_CAP_MS = 4000

const inflight = new Set()

// Tracks a promise until it settles. Returns the same promise.
export function trackSave(promise) {
  inflight.add(promise)
  const done = () => inflight.delete(promise)
  promise.then(done, done)
  return promise
}

// Uploads still running (for tests).
export function pendingCount() {
  return inflight.size
}

// Resolves once every upload started so far has settled (failures included),
// or after capMs, whichever comes first.
export function settleSaves(capMs = SAVE_WAIT_CAP_MS) {
  if (inflight.size === 0) return Promise.resolve()
  let timer
  const cap = new Promise((resolve) => { timer = setTimeout(resolve, capMs) })
  return Promise.race([Promise.allSettled(inflight), cap]).then(() => clearTimeout(timer))
}

// Runs read() after pending uploads have settled (bounded by capMs).
export function readAfterSaves(read, capMs = SAVE_WAIT_CAP_MS) {
  return settleSaves(capMs).then(read)
}
