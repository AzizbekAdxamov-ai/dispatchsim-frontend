// Facts about the fleet shown to the dispatcher before they sign the rate
// confirmation, and again after the load is created. Keyed by the warning
// codes the API sends.
export const PRE_SIGN_COPY = Object.freeze({
  'no-matching-equipment': 'No truck in the fleet is set up for this trailer type.',
  'no-available-driver': 'No driver is free for this pickup right now.',
  'tight-pickup-window': 'The nearest driver may not reach this pickup within their remaining hours.',
})

const AGREED_STATUS = 'agreed'

// The warning lines to show above "Sign and accept": only while the rate is
// agreed and unsigned. An unknown code is shown as sent.
export function preSignWarnings(thread, status, copy = PRE_SIGN_COPY) {
  if (status !== AGREED_STATUS) return []
  
  return (thread?.preSignWarnings ?? []).map((code) => copy[code] || code)
}
