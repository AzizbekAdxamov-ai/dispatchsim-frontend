// The two-step confirm for cancelling a booking, and the wording of what went
// wrong. Pure, so the rule "the first press never cancels" can be tested.

export const CONFIRM_ACTIONS = Object.freeze({ OPEN: 'open', KEEP: 'keep', CONFIRM: 'confirm' })

// state: { confirming }. Returns the next state and whether the cancel call
// must fire now. Only CONFIRM, and only after OPEN, fires it.
export function confirmStep(state, action) {
  if (action === CONFIRM_ACTIONS.OPEN) return { confirming: true, fire: false }
  if (action === CONFIRM_ACTIONS.CONFIRM) return { confirming: false, fire: Boolean(state.confirming) }
  return { confirming: false, fire: false }
}

const NOT_CANCELLABLE = 'LOAD_NOT_CANCELLABLE'
const BROKER_BLOCKED = 'BROKER_BLOCKED'

// kind: 'unassign' | 'cancel'. A delivered load is "already delivered" only
// for the unassign; for the booking it is "can no longer be cancelled".
export function takeBackErrorText({ kind, code, message, copy }) {
  if (code === NOT_CANCELLABLE) return kind === 'cancel' ? copy.notCancellableError : copy.deliveredError
  if (kind === 'cancel' && code === BROKER_BLOCKED) return copy.brokerBlockedError
  return message || (kind === 'cancel' ? copy.cancelError : copy.unassignError)
}
