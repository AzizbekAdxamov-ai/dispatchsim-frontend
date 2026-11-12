// Words for the invoice page's send / remind button.

export const INVOICE_ACTION_KINDS = { send: 'send', remind: 'remind' }

export const INVOICE_ACTION_DISABLED = {
  notDelivered: 'Available once the load is delivered',
  notYourBroker: 'Only the dispatcher who booked this load can message the broker',
}

export const INVOICE_ACTION_COPY = {
  send: 'Send invoice',
  remind: 'Send reminder',
  busy: 'Sending…',
  failed: 'Could not send. Please try again.',
  reminded: 'Reminder posted to the broker thread.',
  sentLabel: 'Sent',
  none: '—',
}
