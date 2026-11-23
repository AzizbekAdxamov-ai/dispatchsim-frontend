// Progress uploads that are still in flight. Leaving a lesson fires one last
// upload while the course list mounts and asks the server for the same rows;
// without waiting, the list can read the state from before that upload.
// Pure: no storage, no network.

const inflight = new Set()

// Tracks a promise until it settles. Returns the same promise.
export function trackSave(promise) {
  inflight.add(promise)
  const done = () => inflight.delete(promise)
  promise.then(done, done)
  return promise
}

// Resolves once every upload started so far has settled (failures included:
// a failed upload must not block the read).
export function settleSaves() {
  if (inflight.size === 0) return Promise.resolve()
  return Promise.allSettled([...inflight]).then(() => undefined)
}
