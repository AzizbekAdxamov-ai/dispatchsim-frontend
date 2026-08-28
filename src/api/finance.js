// Thin layer over api/client.js for /finance/*. Every route requires the
// finance role on the backend.
import { api } from './client'

export function getOverview(signal) {
  return api.get('/finance/overview', { auth: true, signal })
}

export function listInvoices({ status, search, page, limit } = {}, signal) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  if (page) params.set('page', page)
  if (limit) params.set('limit', limit)
  const qs = params.toString()
  return api.get(`/finance/invoices${qs ? `?${qs}` : ''}`, { auth: true, signal })
}

export function getInvoice(id, signal) {
  return api.get(`/finance/invoices/${encodeURIComponent(id)}`, { auth: true, signal })
}

export function listSettlements(signal) {
  return api.get('/finance/settlements', { auth: true, signal })
}

export function listExpenses(signal) {
  return api.get('/finance/expenses', { auth: true, signal })
}
