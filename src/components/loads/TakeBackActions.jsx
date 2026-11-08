import { useEffect, useReducer, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { confirmStep, CONFIRM_ACTIONS } from './takeBackConfirm'
import './TakeBackActions.css'

// Copy for the two ways of taking a load back. Overridable by props.
export const TAKE_BACK_COPY = Object.freeze({
  unassign: 'Unassign driver',
  unassignHint: 'Load stays booked with the broker.',
  unassigning: 'Unassigning…',
  cancelBooking: 'Cancel booking with broker',
  cancelBookingHint: 'The broker is told, the rate con is voided, the load is cancelled.',
  cancelling: 'Cancelling…',
  confirm: 'Confirm cancel',
  keep: 'Keep booking',
  deliveredError: 'This load has already been delivered.',
  unassignError: 'Could not take the load back.',
  cancelError: 'Could not cancel the booking.',
  notCancellableError: 'This booking can no longer be cancelled.',
  cancelledNote: 'This load was cancelled with the broker.',
})

// Seconds of the confirm row sliding in. Azizbek qarori 2026-11-08
const CONFIRM_SECONDS = 0.18

// options: takeBackOptions(load). Cancel booking is irreversible, so it asks
// twice: the first press only opens "Confirm cancel".
export default function TakeBackActions({ options, busy = null, error = '', onUnassign, onCancelBooking, copy = TAKE_BACK_COPY }) {
  const [step, dispatch] = useReducer((state, action) => confirmStep(state, action), { confirming: false, fire: false })
  const { confirming } = step
  const cancelBtnRef = useRef(null)
  const keepBtnRef = useRef(null)
  // Focus follows the row: into it when it opens, back out when kept. Never
  // left on a button that is about to disappear or be disabled.
  useEffect(() => {
    if (confirming) keepBtnRef.current?.focus()
  }, [confirming])
  function press(action) {
    const next = confirmStep(step, action)
    dispatch(action)
    if (next.fire) onCancelBooking()
    if (action === CONFIRM_ACTIONS.KEEP) cancelBtnRef.current?.focus()
  }
  if (!options.unassign && !options.cancelBooking) return null
  const disabled = busy !== null

  return (
    <div className="tb-actions">
      {options.unassign && (
        <div className="tb-action">
          <button type="button" className="ld-cancel-btn" disabled={disabled} onClick={onUnassign}>
            {busy === 'unassign' ? copy.unassigning : copy.unassign}
          </button>
          <div className="tb-hint">{copy.unassignHint}</div>
        </div>
      )}
      {options.cancelBooking && (
        <div className="tb-action">
          <button
            type="button"
            className="ld-cancel-btn"
            ref={cancelBtnRef}
            disabled={disabled}
            aria-expanded={confirming}
            onClick={() => press(CONFIRM_ACTIONS.OPEN)}
          >
            {busy === 'cancel' ? copy.cancelling : copy.cancelBooking}
          </button>
          <div className="tb-hint">{copy.cancelBookingHint}</div>
          <AnimatePresence initial={false}>
            {confirming && (
              <motion.div
                className="tb-confirm"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: CONFIRM_SECONDS }}
              >
                <button
                  type="button"
                  className="ld-cancel-btn tb-confirm-btn"
                  disabled={disabled}
                  onClick={() => press(CONFIRM_ACTIONS.CONFIRM)}
                >
                  {copy.confirm}
                </button>
                <button type="button" ref={keepBtnRef} className="ld-cancel-btn" disabled={disabled} onClick={() => press(CONFIRM_ACTIONS.KEEP)}>
                  {copy.keep}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {error && <div className="ld-cancel-error" role="alert">{error}</div>}
    </div>
  )
}
