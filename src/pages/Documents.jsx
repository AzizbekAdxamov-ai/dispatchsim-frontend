// Documents -- the paperwork desk.
//
// Rows come from real loads: every dispatched load has a BOL (refused with
// a clear error before dispatch, so the button stays honest), every
// delivered load has a POD and an invoice. Downloads hit the document
// endpoints directly; a 409 renders as that row's status pill, not as a
// broken download.
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, DownloadSimple } from '@phosphor-icons/react'
import { listLoads } from '../api/loads'
import { downloadBol, downloadPod, downloadInvoicePdf } from '../api/documents'
import { useResource } from '../hooks/useResource'
import { formatDateTime, formatMoney, formatPlace } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './Documents.css'

const TABS = [
  { key: 'all', label: 'All', status: null },
  { key: 'dispatched', label: 'Dispatched', status: null, match: (l) => l.dispatchedAt && !l.deliveredAt },
  { key: 'delivered', label: 'Delivered', status: 'done', match: (l) => l.status === 'done' },
]

const PAGE_SIZE = 100
const MAX_PAGES = 4

// A document row's state, derived from the load's own facts rather than a
// documents table: paperwork certifies events, and the events are all this
// module knows about.
function docState(load) {
  return {
    bol: load.dispatchedAt ? 'ready' : 'pending',
    pod: load.deliveredAt ? 'ready' : 'pending',
    invoice: load.deliveredAt ? 'ready' : 'pending',
  }
}

function DocAction({ label, state, onClick }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handle() {
    if (state !== 'ready' || busy) return
    setFailed(false)
    setBusy(true)
    try {
      await onClick()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className={'doc-action' + (state !== 'ready' ? ' disabled' : failed ? ' failed' : '')}
      onClick={handle}
      disabled={state !== 'ready' || busy}
      title={state !== 'ready' ? `${label} is not available yet` : `Download ${label}`}
    >
      {state !== 'ready' ? '—' : failed ? 'Retry' : busy ? '…' : <DownloadSimple size={14} aria-hidden="true" />}
    </button>
  )
}

export default function Documents() {
  const [tab, setTab] = useState('all')

  const activeTab = TABS.find((t) => t.key === tab)

  const fetchDocs = useCallback(
    async (signal) => {
      const baseParams = { limit: PAGE_SIZE }
      const first = await listLoads(activeTab.status ? { ...baseParams, status: activeTab.status } : baseParams, signal)
      let rows = first.loads
      const totalPages = Math.min(MAX_PAGES, Math.ceil(first.meta.total / PAGE_SIZE))
      const extra = []
      for (let page = 2; page <= totalPages; page += 1) {
        extra.push(listLoads(activeTab.status ? { ...baseParams, status: activeTab.status, page } : { ...baseParams, page }, signal))
      }
      if (extra.length > 0) rows = rows.concat(...(await Promise.all(extra)).map((r) => r.loads))
      return { loads: rows, meta: first.meta }
    },
    [activeTab.status],
  )

  const { data, error, loading } = useResource(fetchDocs, [activeTab.status], { pollMs: 30000 })

  const rows = useMemo(() => {
    if (!data) return []
    const list = data.loads.filter((l) => activeTab.match ? activeTab.match(l) : true)
    return list.sort((a, b) => (b.pickupAt ?? '').localeCompare(a.pickupAt ?? ''))
  }, [data, activeTab])

  return (
    <div className="documents-page">
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Load paperwork generated from the run itself — BOL, POD and invoices</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={'page-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            {t.label} <span className="page-tab-count">{data ? (t.match ? rows.length : data.meta.total) : '—'}</span>
          </button>
        ))}
      </div>

      <div className="panel load-board documents-table">
        <table>
          <thead>
            <tr>
              <th>Load</th>
              <th>Route</th>
              <th>Broker</th>
              <th>Rate</th>
              <th>Pickup</th>
              <th>BOL</th>
              <th>POD</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="page-empty">Loading documents…</td></tr>}
            {!loading && error && <tr><td colSpan={8} className="page-empty">Could not load documents — {error.message}</td></tr>}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {rows.map((load) => {
                  const state = docState(load)
                  return (
                    <motion.tr
                      className="row"
                      key={load.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <td className="load-id mono">
                        <Link to={'/loads/' + load.id} className="row-primary-link">#{load.id}</Link>
                      </td>
                      <td>
                        <div className="route">
                          {formatPlace(load.originCity, load.originState)} <span className="arrow">→</span> {formatPlace(load.destinationCity, load.destinationState)}
                        </div>
                      </td>
                      <td>{load.broker}</td>
                      <td className="rate mono">{formatMoney(load.rateUsd)}</td>
                      <td className="mono">{formatDateTime(load.pickupAt)}</td>
                      <td><DocAction label="BOL" state={state.bol} onClick={() => downloadBol(load.id)} /></td>
                      <td><DocAction label="POD" state={state.pod} onClick={() => downloadPod(load.id)} /></td>
                      <td><DocAction label="Invoice" state={state.invoice} onClick={() => downloadInvoicePdf(`INV-${new Date(load.deliveredAt ?? load.bookedAt).getFullYear()}-${load.id}`)} /></td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="page-empty">
                  <FileText size={24} weight="thin" className="doc-empty-icon" aria-hidden="true" />
                  No paperwork yet. Documents appear as loads are dispatched and delivered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
