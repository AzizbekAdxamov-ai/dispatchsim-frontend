import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MagnifyingGlass, FileText } from '@phosphor-icons/react'
import { loads, complianceDocuments } from '../data/mockData'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Documents.css'

const STATUS_LABEL = { ready: 'Ready', pending: 'Pending', expiring: 'Expiring soon' }

function loadDocuments() {
  return loads.flatMap((load) =>
    load.documents.map((doc) => ({
      id: load.id + '-' + doc.name,
      name: doc.name,
      category: 'Load',
      related: '#' + load.id,
      loadId: load.id,
      type: doc.meta.startsWith('PDF') ? 'PDF' : '—',
      size: doc.meta.includes('·') ? doc.meta.split('·')[1].trim() : '—',
      status: doc.ready ? 'ready' : 'pending',
      updated: doc.ready ? load.pickup : '—',
    }))
  )
}

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'load', label: 'Load documents', match: (d) => d.category === 'Load' },
  { key: 'driver', label: 'Driver', match: (d) => d.category === 'Driver' },
  { key: 'company', label: 'Company & equipment', match: (d) => d.category === 'Company' || d.category === 'Equipment' },
]

export default function Documents() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  const allDocuments = useMemo(
    () => [
      ...loadDocuments(),
      ...complianceDocuments.map((d) => ({ ...d, related: d.category })),
    ],
    []
  )

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    const q = query.trim().toLowerCase()
    return allDocuments.filter((d) => {
      if (!activeTab.match(d)) return false
      if (!q) return true
      return d.name.toLowerCase().includes(q) || d.related.toLowerCase().includes(q)
    })
  }, [allDocuments, tab, query])

  return (
    <div className="documents-page">
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Load paperwork and compliance files in one place</div>
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
            placeholder="Document name or load/driver..."
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
                </div>
              </div>
              <div className="doc-related">
                {doc.loadId ? (
                  <button className="doc-related-link" onClick={() => navigate('/loads/' + doc.loadId)}>
                    {doc.related}
                  </button>
                ) : (
                  <span className="doc-related-tag">{doc.related}</span>
                )}
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
