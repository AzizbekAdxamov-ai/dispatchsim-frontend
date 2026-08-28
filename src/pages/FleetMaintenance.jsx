import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Wrench } from '@phosphor-icons/react'
import { MAINTENANCE_STATUS_LABEL } from '../data/fleetData'
import { listMaintenance, listTrucks } from '../api/fleet'
import { useResource } from '../hooks/useResource'
import { formatDate, formatMiles, formatMoney } from '../utils/format'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './FleetMaintenance.css'

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'overdue', label: 'Overdue', match: (m) => m.status === 'overdue' },
  { key: 'due', label: 'Due soon', match: (m) => m.status === 'due' },
  { key: 'scheduled', label: 'Scheduled', match: (m) => m.status === 'scheduled' },
  { key: 'done', label: 'Completed', match: (m) => m.status === 'done' },
]

export default function FleetMaintenance() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')

  const fetchAll = useCallback(async (signal) => {
    const [maintenance, trucks] = await Promise.all([listMaintenance(signal), listTrucks(signal)])
    return { maintenance, trucks }
  }, [])

  const { data, error, loading } = useResource(fetchAll, [])

  const records = data?.maintenance?.records ?? []
  const counts = data?.maintenance?.meta?.counts
  const monthCostUsd = data?.maintenance?.meta?.monthCostUsd

  const truckMetaById = useMemo(() => {
    const map = new Map()
    for (const t of data?.trucks?.trucks ?? []) map.set(t.id, `${t.make} ${t.model}`)
    return map
  }, [data])

  function truckMeta(truckId) {
    return truckMetaById.get(truckId) ?? truckId
  }

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    return records.filter(activeTab.match)
  }, [records, tab])

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Maintenance</div>
          <div className="page-sub">Service schedule and completed work history</div>
        </div>
      </div>

      <div className="fleet-summary-row">
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Overdue</div>
          <div className="fleet-summary-value red">{counts ? counts.overdue : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Due soon</div>
          <div className="fleet-summary-value amber">{counts ? counts.due : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Scheduled</div>
          <div className="fleet-summary-value">{counts ? counts.scheduled : '—'}</div>
        </div>
        <div className="fleet-summary-card">
          <div className="fleet-summary-label">Spent this month</div>
          <div className="fleet-summary-value mono">{monthCostUsd != null ? formatMoney(monthCostUsd) : '—'}</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{loading ? '—' : records.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {loading && <div className="page-empty">Loading maintenance records…</div>}
        {!loading && error && <div className="page-empty">Could not load maintenance records — {error.message}</div>}
        {!loading && !error && filtered.length === 0 && <div className="page-empty">No service records in this category.</div>}
        {!loading && !error && (
          <AnimatePresence initial={false}>
            {filtered.map((m) => (
              <motion.button
                className="maint-row"
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => navigate('/fleet/trucks/' + m.truckId)}
              >
                <div className="maint-icon"><Wrench size={15} aria-hidden="true" /></div>
                <div className="maint-info">
                  <div className="maint-service">{m.service}</div>
                  <div className="maint-meta">{m.truckId} · {truckMeta(m.truckId)}</div>
                </div>
                <div className="maint-due">
                  <div className="maint-due-label">Due</div>
                  <div className="maint-due-value mono">
                    {m.dueDate ? formatDate(m.dueDate) : '—'}
                    {m.dueMileage ? <> · {formatMiles(m.dueMileage)}</> : null}
                  </div>
                </div>
                <div className="maint-last">
                  <div className="maint-due-label">Last service</div>
                  <div className="maint-due-value mono">{m.lastServiceDate ? formatDate(m.lastServiceDate) : '—'}</div>
                </div>
                <div className="maint-cost mono">{typeof m.costUsd === 'number' ? formatMoney(m.costUsd) : '—'}</div>
                <span className={'maint-status ' + m.status}>{MAINTENANCE_STATUS_LABEL[m.status]}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
