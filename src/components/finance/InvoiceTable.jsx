import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { INVOICE_STATUS_LABEL } from '../../data/financeData'
import { formatMoney, formatDate } from '../../utils/format'
import '../dashboard/Panel.css'
import '../dashboard/LoadBoard.css'

const STATUS_BADGE = {
  paid: 'done',
  open: 'ontime',
  overdue: 'crit',
  draft: 'neutral',
}

export default function InvoiceTable({ invoices }) {
  const navigate = useNavigate()

  return (
    <div className="panel load-board">
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Load</th>
            <th>Broker</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {invoices.map((invoice) => (
              <motion.tr
                className="row"
                key={invoice.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => navigate('/finance/invoices/' + invoice.id)}
              >
                <td className="load-id mono">{invoice.id}</td>
                <td className="mono">{invoice.loadId ?? '—'}</td>
                <td>{invoice.broker}</td>
                <td>{invoice.issuedAt ? formatDate(invoice.issuedAt) : '—'}</td>
                <td>
                  {invoice.dueAt ? formatDate(invoice.dueAt) : '—'}
                  {invoice.status === 'overdue' && (
                    <div className="invoice-days-past-due">{invoice.daysPastDue} days past due</div>
                  )}
                </td>
                <td className="rate mono">{formatMoney(invoice.amountUsd)}</td>
                <td>
                  <span className={'badge ' + STATUS_BADGE[invoice.status]}>
                    <span className="dot"></span>
                    {INVOICE_STATUS_LABEL[invoice.status]}
                  </span>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {invoices.length === 0 && (
            <tr>
              <td colSpan={7} className="page-empty">No invoices match this filter.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
