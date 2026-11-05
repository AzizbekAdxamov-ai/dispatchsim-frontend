export const LOGIN_FEEDBACK = {
  invalid: 'Email or password is incorrect',
  limited: 'Too many attempts. Try again in a few minutes.',
  network: 'Cannot reach the server. Is the API running?',
  unknown: 'Something went wrong. Please try again.',
  signingIn: 'Signing in…',
  signIn: 'Sign in',
  cooldown: seconds => `Too many attempts. Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`,
}

export function cooldownSeconds(details) {
  const seconds = details?.retryAfterSeconds
  return Number.isInteger(seconds) && seconds > 0 ? Math.min(900, seconds) : 900
}
