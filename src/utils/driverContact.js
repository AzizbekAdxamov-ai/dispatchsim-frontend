import { CALL_DRAFT, CONTACT_INTENT, CONTACT_DISABLED } from '../data/driverContact.js'

// Where Call / Message send the dispatcher: the driver chat with that driver
// open, and for a call a drafted line waiting in the box.
export function driverChatPath(driverId, intent) {
  const params = new URLSearchParams({ driver: driverId })
  if (intent) params.set('intent', intent)
  return `/driver-chat?${params.toString()}`
}

// Whether the buttons work for this driver, and if not, why (shown as the tooltip).
// Accepts the driver page's object (employment.hasLeft) or a truck's driver (hasLeft).
export function contactState(driver) {
  if (!driver) return { disabled: true, reason: CONTACT_DISABLED.noDriver }
  const hasLeft = driver.employment?.hasLeft ?? driver.hasLeft
  if (hasLeft) return { disabled: true, reason: CONTACT_DISABLED.hasLeft }
  return { disabled: false, reason: undefined }
}

// The text to pre-fill for an intent; '' for a plain message.
export function draftForIntent(intent) {
  return intent === CONTACT_INTENT.call ? CALL_DRAFT : ''
}
