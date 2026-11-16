// Words for the change-password panel on every settings page. Kept here so
// the component itself carries no text.

export const PASSWORD_COPY = {
  title: 'Password',
  currentLabel: 'Current password',
  newLabel: 'New password',
  hint: 'At least 8 characters.',
  button: 'Update password',
  buttonBusy: 'Updating…',
  success: 'Password updated.',
  mustChangeNotice: 'Your administrator set a temporary password. Choose a new one below.',
  errors: {
    missingCurrent: 'Enter your current password.',
    tooShort: 'New password must be at least 8 characters.',
    tooLong: 'New password must be at most 72 characters.',
    same: 'New password must be different from the current one.',
    CURRENT_PASSWORD_WRONG: 'Current password is incorrect.',
    PASSWORD_UNCHANGED: 'New password must be different from the current one.',
    RATE_LIMITED: 'Too many attempts. Try again in a few minutes.',
    VALIDATION_ERROR: 'New password must be between 8 and 72 characters.',
    NETWORK_ERROR: 'Cannot reach the server. Please try again shortly.',
    unknown: 'Something went wrong. Please try again.',
  },
}
