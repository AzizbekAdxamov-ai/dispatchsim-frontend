import { useParams, useNavigate, Link } from 'react-router-dom'
import { DownloadSimple, PaperPlaneTilt } from '@phosphor-icons/react'
import { INVOICE_STATUS_LABEL, PAYMENT_TERMS } from '../data/financeData'
import { EQUIPMENT_TYPES, formatEquipment } from '../data/equipmentTypes'
import { getInvoice } from '../api/finance'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatDate, formatPlace, formatWeight, formatDateTime, formatDistance } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './InvoiceDetail.css'

const STATUS_BADGE = {
  paid: 'done',
  open: 'ontime',
  overdue: 'crit',
  draft: 'neutral',
}

// Days between the invoice being issued (delivery) and either today or the
// date it was paid. `issuedAt`/a payment's `paidAt` are real ISO
// timestamps from the API — see the bugfix this replaces: the old code ran
// `new Date(invoice.issued)` on a hand-formatted display string like
// 'Aug 17, 2026', which is browser-dependent and silently unreliable.
function daysOutstanding(invoice) {
  if (invoice.status === 'draft' || !invoice.issuedAt) return null
  const start = new Date(invoice.issuedAt)
  const paidAt = invoice.payments[0]?.paidAt
  const end = invoice.status === 'paid' && paidAt ? new Date(paidAt) : new Date()
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: invoice, error, loading } = useResource((signal) => getInvoice(id, signal), [id], { pollMs: 20000 })

  if (loading) {
    return <div className="panel invoice-detail-missing"><p>Loading invoice…</p></div>
  }

  if (error?.code === 'LOAD_NOT_FOUND') {
    return (
      <div className="panel invoice-detail-missing">
        <p>Invoice not found.</p>
        <Link to="/finance/invoices">← Back to invoices</Link>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="panel invoice-detail-missing">
        <p>Could not load invoice{error ? ` — ${error.message}` : ''}.</p>
        <Link to="/finance/invoices">← Back to invoices</Link>
      </div>
    )
  }

  const load = invoice.load
  const equip = load ? EQUIPMENT_TYPES[load.equipmentType] : null
  const outstanding = daysOutstanding(invoice)

  return (
    <div>
      <div className="invoice-detail-crumbs">
        <button className="invoice-detail-back" onClick={() => navigate('/finance/invoices')}>
          ← Invoices
        </button>
      </div>

      <div className="invoice-detail-head">
        <div>
          <div className="invoice-detail-id-row">
            <div className="invoice-detail-id mono">{invoice.id}</div>
            <span className={'badge ' + STATUS_BADGE[invoice.status] + ' invoice-detail-status-pill'}>
              <span className="dot"></span>
              {INVOICE_STATUS_LABEL[invoice.status]}
            </span>
          </div>
          <div className="invoice-detail-meta">{invoice.broker}</div>
        </div>
        <div className="invoice-detail-actions">
          <button className="invoice-detail-btn">
            <DownloadSimple size={14} aria-hidden="true" /> Download PDF
          </button>
          <button className="invoice-detail-btn primary">
            <PaperPlaneTilt size={14} aria-hidden="true" />
            {invoice.status === 'draft' ? 'Send invoice' : 'Send reminder'}
          </button>
        </div>
      </div>

      <div className="invoice-stat-mini-row">
        <div className="invoice-stat-mini">
          <div className="invoice-stat-mini-label">Amount</div>
          <div className="invoice-stat-mini-value mono">{formatMoney(invoice.amountUsd)}</div>
        </div>
        <div className="invoice-stat-mini">
          <div className="invoice-stat-mini-label">Terms</div>
          <div className="invoice-stat-mini-value">{PAYMENT_TERMS[invoice.paymentTerms]}</div>
        </div>
        <div className="invoice-stat-mini">
          <div className="invoice-stat-mini-label">Days outstanding</div>
          <div className="invoice-stat-mini-value mono">
            {outstanding === null ? '—' : outstanding + ' days'}
          </div>
        </div>
        <div className="invoice-stat-mini">
          <div className="invoice-stat-mini-label">Expected payment</div>
          <div className="invoice-stat-mini-value">{invoice.dueAt ? formatDate(invoice.dueAt) : '—'}</div>
        </div>
      </div>

      <div className="panel invoice-detail-panel">
        <div className="panel-head">
          <div className="panel-title">Line items</div>
        </div>
        <table className="invoice-line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={i}>
                <td>{item.label}</td>
                <td className="mono">{formatMoney(item.amountUsd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="invoice-line-items-total">
              <td>Total</td>
              <td className="mono">{formatMoney(invoice.amountUsd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {load && (
        <div className="panel invoice-detail-panel">
          <div className="panel-head">
            <div className="panel-title">Load summary</div>
          </div>
          <div className="invoice-load-summary">
            <div className="invoice-load-summary-item invoice-load-summary-wide">
              <div className="invoice-load-summary-label">Route</div>
              <div className="invoice-load-summary-value">
                {formatPlace(load.originCity, load.originState)} <span className="arrow">→</span> {formatPlace(load.destinationCity, load.destinationState)}
              </div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Miles</div>
              <div className="invoice-load-summary-value mono">{formatDistance(load.distanceMi)}</div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Equipment</div>
              <div className="invoice-load-summary-value">{equip ? equip.label : '—'}</div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Weight</div>
              <div className="invoice-load-summary-value mono">{formatWeight(load.weightLbs)}</div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Driver</div>
              <div className="invoice-load-summary-value">{load.driver ? load.driver.name : 'Unassigned'}</div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Pickup</div>
              <div className="invoice-load-summary-value mono">{formatDateTime(load.pickupAt)}</div>
            </div>
            <div className="invoice-load-summary-item">
              <div className="invoice-load-summary-label">Delivery</div>
              <div className="invoice-load-summary-value mono">{formatDateTime(load.deliveryAt)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="panel invoice-detail-panel">
        <div className="panel-head">
          <div className="panel-title">Payment history</div>
        </div>
        {invoice.payments.length === 0 ? (
          <div className="page-empty">No payments received yet.</div>
        ) : (
          <table className="invoice-payments">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment, i) => (
                <tr key={i}>
                  <td>{formatDate(payment.paidAt)}</td>
                  <td className="mono">{formatMoney(payment.amountUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
