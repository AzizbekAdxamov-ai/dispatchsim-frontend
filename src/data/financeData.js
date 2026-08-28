// Display-label maps only. Every derived figure this file used to compute
// (invoices, aging buckets, driver settlements, expenses, load
// profitability, cash flow, headline KPIs) now comes from the real
// backend — see api/finance.js and finance.service.js. The filename is
// kept (not deleted) so the existing imports across the finance pages
// don't need to change: only the label maps below still live here.
export const INVOICE_STATUS_LABEL = {
  draft: 'Draft',
  open: 'Open',
  paid: 'Paid',
  overdue: 'Past due',
}

export const PAYMENT_TERMS = {
  net30: 'Net 30',
  net15: 'Net 15',
  quickpay: 'Quick Pay (2%)',
}

export const EXPENSE_CATEGORIES = {
  fuel: { label: 'Fuel', tone: 'amber' },
  maintenance: { label: 'Maintenance', tone: 'blue' },
  insurance: { label: 'Insurance', tone: 'green' },
  tolls: { label: 'Tolls & permits', tone: 'accent' },
  other: { label: 'Other', tone: 'text-2' },
}
