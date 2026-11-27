// Pure helpers for the Academy entrance overlay. No DOM, no JSX: the Node runner
// imports this file directly.

export const SEEN_KEY = 'gm.intro.seen' // sessionStorage: played once in this tab
export const MUTE_KEY = 'gm.intro.mute' // localStorage: '1' = sound off
export const HARD_CAP_MS = 6000 // the overlay never outlives this
export const FULL_MS = 3300
export const SHORT_WAIT_MS = 1200
export const REDUCED_MIN_MS = 250
export const REDUCED_FADE_MS = 150
export const OUT_MS = 550

export function isAcademyPath(p) {
  return p === '/academy' || (typeof p === 'string' && p.startsWith('/academy/'))
}

// Plays only when someone walks in from elsewhere: not on first load or
// refresh (no previous path), not inside the academy, not on back/forward.
export function shouldPlayIntro({ prevPath, nextPath, navigationType }) {
  if (prevPath == null || isAcademyPath(prevPath)) return false
  if (!isAcademyPath(nextPath)) return false
  return navigationType !== 'POP'
}

// An overlay that is up when the route leaves the academy must go.
export function shouldDropIntro(nextPath) {
  return !isAcademyPath(nextPath)
}

export function pickMode({ seen, reducedMotion }) {
  if (reducedMotion) return 'reduced'
  return seen ? 'short' : 'full'
}

// Storage can be missing or throw (private mode, blocked cookies).
export function readFlag(storage, key) {
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

// val true stores '1'; false removes the key.
export function writeFlag(storage, key, val) {
  try {
    if (val) storage.setItem(key, '1')
    else storage.removeItem(key)
  } catch {
    // ignore
  }
}
