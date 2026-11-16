// Client-side password checks. They mirror the server's bounds
// (backend/src/constants/password.js) only to save a round trip; the server
// is still the one that decides.

export const PASSWORD_MIN_LENGTH = 8
// bcrypt's own input limit: anything longer is rejected, not silently cut.
export const PASSWORD_MAX_LENGTH = 72

// The first problem with the form, as a key the caller maps to its own words,
// or null when the form can be sent.
export function passwordFormProblem({ current, next }) {
  if (!current) return 'missingCurrent'
  if (next.length < PASSWORD_MIN_LENGTH) return 'tooShort'
  if (next.length > PASSWORD_MAX_LENGTH) return 'tooLong'
  if (next === current) return 'same'
  return null
}
