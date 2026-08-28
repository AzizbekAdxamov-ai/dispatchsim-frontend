import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MagnifyingGlass, FileText } from '@phosphor-icons/react'
import { fleetDocuments, trucks } from '../data/fleetData'
import { complianceDocuments } from '../data/mockData'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Documents.css'

const STATUS_LABEL = { ready: 'Ready', pending: 'Pending', expiring: 'Expiring soon' }

function truckRegion(truckId) {
  const truck = trucks.find((t) => t.id === truckId)
  return truck ? truck.location : truckId
}

export default function FleetDocuments() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  const allDocuments = useMemo(() => [
    ...fleetDocuments.map((d) => ({
      id: d.id,
      name: d.name,
      category: 'vehicle',
      related: d.truckId,
      truckId: d.truckId,
      type: d.type,
      size: d.size,
      status: d.status,
      updated: d.updated,
      expires: d.expires,
    })),
    ...complianceDocuments
      .filter((d) => d.category === 'Company' || d.category === 'Equipment')
      .map((d) => ({
        id: d.id,
        name: d.name,
        category: 'company',
        related: d.category,
        truckId: null,
        type: d.type,
        size: d.size,
        status: d.status,
        updated: d.updated,
        expires: d.expires,
      })),
  ], [])

  const TABS = [
    { key: 'all', label: 'All', match: () => true },
    { key: 'vehicle', label: 'Vehicle documents', match: (d) => d.category === 'vehicle' },
    { key: 'company', label: 'Company', match: (d) => d.category === 'company' },
  ]

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    const q = query.trim().toLowerCase()
    return allDocuments.filter((d) => {
      if (!activeTab.match(d)) return false
      if (!q) return true
      return d.name.toLowerCase().includes(q) || (d.related || '').toLowerCase().includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDocuments, tab, query])

  return (
    <div className="documents-page">
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Vehicle and company paperwork in one place</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{allDocuments.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by document name or truck ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">{filtered.length} documents</div>
      </div>

      <div className="panel">
        {filtered.length === 0 && <div className="page-empty">No documents match this filter.</div>}
        <AnimatePresence initial={false}>
          {filtered.map((doc) => (
            <motion.div
              className="doc-row"
              key={doc.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="doc-icon"><FileText size={15} aria-hidden="true" /></div>
              <div className="doc-info">
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">
                  {doc.type} · {doc.size}
                  {doc.expires ? <> · expires {doc.expires}</> : null}
                  {doc.truckId ? <> · {truckRegion(doc.truckId)}</> : null}
                </div>
              </div>
              <div className="doc-related">
                <span className="doc-related-tag">{doc.related}</span>
              </div>
              <span className={'doc-status ' + doc.status}>{STATUS_LABEL[doc.status]}</span>
              <div className={'doc-action' + (doc.status === 'pending' ? ' disabled' : '')}>
                {doc.status === 'pending' ? '—' : 'View'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
