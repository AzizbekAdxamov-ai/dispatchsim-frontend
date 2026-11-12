import { INVOICE_ACTION_KINDS, INVOICE_ACTION_DISABLED } from '../data/invoiceActionCopy.js'

// Which button the invoice page shows, if any, and whether it can be pressed.
//   draft            -> send, disabled (nothing delivered yet)
//   open / overdue, not sent -> send
//   open, sent       -> nothing (waiting for the due date)
//   overdue, sent    -> remind (only for the dispatcher who booked the load)
//   paid             -> nothing
export function invoiceAction(invoice) {
  const none = { kind: null, disabled: false, reason: undefined }
  if (!invoice) return none

  if (invoice.status === 'paid') return none

  if (invoice.status === 'draft') {
    return { kind: INVOICE_ACTION_KINDS.send, disabled: true, reason: INVOICE_ACTION_DISABLED.notDelivered }
  }

  if (!invoice.sentAt) {
    return { kind: INVOICE_ACTION_KINDS.send, disabled: false, reason: undefined }
  }

  if (invoice.status === 'overdue') {
    if (!invoice.canRemindBroker) {
      return { kind: INVOICE_ACTION_KINDS.remind, disabled: true, reason: INVOICE_ACTION_DISABLED.notYourBroker }
    }
    return { kind: INVOICE_ACTION_KINDS.remind, disabled: false, reason: undefined }
  }

  return none
}
