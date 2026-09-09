import { useCallback, useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { listInvoices } from '../api/finance'
import { useResource } from '../hooks/useResource'
import InvoiceTable from '../components/finance/InvoiceTable'
import './PageHeader.css'
import './FinanceInvoices.css'

const TABS = [
  { key: 'all', label: 'All', status: undefined },
  { key: 'draft', label: 'Draft', status: 'draft' },
  { key: 'open', label: 'Open', status: 'open' },
  { key: 'overdue', label: 'Past due', status: 'overdue' },
  { key: 'paid', label: 'Paid', status: 'paid' },
]

const MAX_PAGES = 3
const PAGE_SIZE = 100

export default function FinanceInvoices() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  const activeTab = TABS.find((t) => t.key === tab)
  const search = query.trim() || undefined

  const fetchInvoices = useCallback(
    async (signal) => {
      const baseParams = { status: activeTab.status, search, limit: PAGE_SIZE }
      const first = await listInvoices(baseParams, signal)
      let rows = first.invoices
      const meta = first.meta
      const totalPages = Math.min(MAX_PAGES, Math.ceil(meta.total / PAGE_SIZE))
      const extra = []
      for (let page = 2; page <= totalPages; page += 1) {
        extra.push(listInvoices({ ...baseParams, page }, signal))
      }
      if (extra.length > 0) {
        const rest = await Promise.all(extra)
        rows = rows.concat(...rest.map((r) => r.invoices))
      }
      return { invoices: rows, meta }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab.status, search],
  )

  const { data, error, loading } = useResource(fetchInvoices, [activeTab.status, search], { pollMs: 20000 })

  const invoices = data?.invoices ?? []
  const counts = data?.meta?.counts

  const filtered = useMemo(() => invoices, [invoices])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Invoices</div>
          <div className="page-sub">Accounts receivable</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{counts ? (counts[t.key] ?? 0) : '—'}</span>
          </button>
        ))}
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Invoice number, broker or load ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">{loading ? '…' : `${filtered.length} invoices`}</div>
      </div>

      {loading && <div className="page-empty">Loading invoices…</div>}
      {!loading && error && <div className="page-empty">Could not load invoices — {error.message}</div>}
      {!loading && !error && <InvoiceTable invoices={filtered} />}
    </>
  )
}
