// Is the live data still arriving?
//
// useResource polls on more than twenty screens. When a background poll
// failed it did exactly nothing -- kept the data it had, set no error,
// logged nothing. So a dispatcher could sit in front of a board that
// stopped updating ten minutes ago, with a truck frozen mid-lane and an
// alert that never arrives, and the app would look completely normal.
// That is the one failure mode this project forbids outright.
//
// It is one store rather than per-page state on purpose: the fact worth
// telling the user is "live data is not arriving", which is true of the
// whole app at once, and wiring a notice into twenty pages by hand is
// twenty chances to forget one. useResource reports here; AppShell
// renders it once.
//
// Pure module state, no React: it is imported by the hook (which runs in
// every page) and by exactly one component, and a context provider would
// re-render the entire tree on every poll tick.

const failures = new Map() // key -> { message, since }
const listeners = new Set()
let lastOkAt = null

// The snapshot is BUILT on change, not on read, and handed out by
// reference. useSyncExternalStore compares the value it gets from
// getSnapshot with the previous one and re-renders when they differ -- a
// fresh object every read would differ every time and spin forever. This
// is also why reportPoll returns early when nothing actually changed.
let current = build()

function build() {
  const entries = [...failures.values()]
  const oldest = entries.reduce((min, f) => (min == null || f.since < min ? f.since : min), null)
  return {
    failingCount: entries.length,
    // The first reason is enough for the notice -- when the API is down
    // every poll reports the same thing, and listing twenty copies of it
    // would bury the sentence that matters.
    message: entries[0]?.message ?? null,
    since: oldest,
    lastOkAt,
  }
}

function emit() {
  current = build()
  for (const fn of listeners) fn(current)
}

// A failing poll reports its reason; a succeeding one reports null.
// `since` is kept from the FIRST consecutive failure, so the notice can
// say how long this has been going on rather than resetting every tick.
export function reportPoll(key, error) {
  if (error) {
    const existing = failures.get(key)
    failures.set(key, { message: error.message, since: existing?.since ?? Date.now() })
  } else {
    lastOkAt = Date.now()
    if (!failures.delete(key)) return // nothing changed; do not wake the tree
  }
  emit()
}

// A page that unmounts is not a page that is failing.
export function forgetPoll(key) {
  if (failures.delete(key)) emit()
}

export function snapshot() {
  return current
}

export function subscribePollHealth(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Tests and a full remount start clean.
export function resetPollHealth() {
  failures.clear()
  lastOkAt = null
  emit()
}
