import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
  cancelledNote: 'This load was cancelled with the broker.',
})

// Seconds of the confirm row sliding in. Azizbek qarori 2026-11-08
const CONFIRM_SECONDS = 0.18

// options: takeBackOptions(load). Cancel booking is irreversible, so it asks
// twice: the first press only opens "Confirm cancel".
export default function TakeBackActions({ options, busy = null, error = '', onUnassign, onCancelBooking, copy = TAKE_BACK_COPY }) {
  const [confirming, setConfirming] = useState(false)
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
            disabled={disabled || confirming}
            onClick={() => setConfirming(true)}
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
                  onClick={async () => { await onCancelBooking(); setConfirming(false) }}
                >
                  {copy.confirm}
                </button>
                <button type="button" className="ld-cancel-btn" disabled={disabled} onClick={() => setConfirming(false)}>
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
