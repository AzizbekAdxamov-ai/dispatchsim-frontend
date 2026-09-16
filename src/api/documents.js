// Document downloads. Same pattern as downloadRateConfirmation: the
// response is a PDF, not JSON, so it cannot go through api.get -- but it
// uses the SAME base URL and token storage as every other call.
import { API_BASE, getToken, ApiError } from './client'

async function downloadPdf(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.code ?? 'INTERNAL_ERROR', body.message || 'Download failed', res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Bill of lading -- dispatch work. Refused (409) before the load is dispatched.
export function downloadBol(loadId) {
  return downloadPdf(`/documents/loads/${encodeURIComponent(loadId)}/bol.pdf`, `bol-${loadId}.pdf`)
}

// Proof of delivery -- refused (409) until the load is delivered.
export function downloadPod(loadId) {
  return downloadPdf(`/documents/loads/${encodeURIComponent(loadId)}/pod.pdf`, `pod-${loadId}.pdf`)
}

// Invoice PDF -- id is the derived finance id ('INV-2026-4471').
export function downloadInvoicePdf(invoiceId) {
  return downloadPdf(`/documents/invoices/${encodeURIComponent(invoiceId)}/invoice.pdf`, `invoice-${invoiceId}.pdf`)
}
