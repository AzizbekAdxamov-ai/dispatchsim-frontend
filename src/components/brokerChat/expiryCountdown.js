// The time left on the posting, shown above the messages of a thread. The
// server sends the moment the posting stops being available to this thread
// (its own posted expiry, or the hold that carries it further) and how many
// minutes before it the broker warns; this turns that into one line.
export const EXPIRY_COPY = Object.freeze({
  remaining: (minutes) => `Posting expires in ${minutes} min`,
  underMinute: 'Posting expires in under a minute',
  expired: 'Posting expired',
})

// How often the line is recomputed while the thread is open.
export const EXPIRY_TICK_MS = 15_000

const MS_PER_MINUTE = 60_000

// {text, warn} or null when there is nothing to show (no expiry, or booked).
export function expiryLabel({ expiresAt, warnMinutes, now = Date.now(), copy = EXPIRY_COPY }) {
  if (!expiresAt) return null
  const left = new Date(expiresAt).getTime() - now
  if (Number.isNaN(left)) return null
  if (left <= 0) return { text: copy.expired, warn: true }
  const warn = left <= warnMinutes * MS_PER_MINUTE
  if (left < MS_PER_MINUTE) return { text: copy.underMinute, warn }
  return { text: copy.remaining(Math.ceil(left / MS_PER_MINUTE)), warn }
}
