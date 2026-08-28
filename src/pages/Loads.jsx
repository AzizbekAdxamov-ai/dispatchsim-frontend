import { useCallback, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { STATUS_LABEL } from '../data/mockData'
import { EQUIPMENT_TYPES, EQUIPMENT_ORDER, formatEquipment } from '../data/equipmentTypes'
import { listLoads } from '../api/loads'
import { useResource } from '../hooks/useResource'
import { formatDistance, formatDateTime, formatMoney, formatPlace } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './Loads.css'

// Tab keys map 1:1 to a real `status` column value where possible so that
// value can be sent straight to the API (?status=neutral, ?status=crit).
// 'all' and 'active' have no single-status equivalent on the backend
// (LOAD_STATUSES is one enum value per request) — 'active' covers three
// statuses (ontime/warn/crit) at once — so those two tabs fetch every
// status and filter client-side, same as the mock-era TABS array's own
// `match` predicates below.
const TABS = [
  { key: 'all', label: 'All', status: null, match: () => true },
  { key: 'active', label: 'Active', status: null, match: (l) => ['ontime', 'warn', 'crit'].includes(l.status) },
  { key: 'pending', label: 'Pending', status: 'neutral', match: (l) => l.status === 'neutral' },
  { key: 'delivered', label: 'Delivered', status: 'done', match: (l) => l.status === 'done' },
  { key: 'delayed', label: 'Delayed', status: 'crit', match: (l) => l.status === 'crit' },
]

// The API paginates at 100 rows max per page. The full board is ~200 loads
// — for the 'all'/'active' tabs (no single status filter possible) every
// page up to this cap is fetched and merged so a tab's row list is never
// silently truncated to just its first page.
const MAX_PAGES = 4
const PAGE_SIZE = 100

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Loads() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [equip, setEquip] = useState('all')

  const activeTab = TABS.find((t) => t.key === tab)
  const debouncedQuery = query.trim()
  const equipmentType = equip === 'all' ? undefined : equip

  const fetchLoads = useCallback(
    async (signal) => {
      const baseParams = { equipmentType, search: debouncedQuery || undefined, limit: PAGE_SIZE }
      const first = await listLoads(activeTab.status ? { ...baseParams, status: activeTab.status } : baseParams, signal)
      let rows = first.loads
      const meta = first.meta
      const totalPages = Math.min(MAX_PAGES, Math.ceil(meta.total / PAGE_SIZE))
      const extraFetches = []
      for (let page = 2; page <= totalPages; page += 1) {
        extraFetches.push(
          listLoads(activeTab.status ? { ...baseParams, status: activeTab.status, page } : { ...baseParams, page }, signal),
        )
      }
      if (extraFetches.length > 0) {
        const rest = await Promise.all(extraFetches)
        rows = rows.concat(...rest.map((r) => r.loads))
      }
      return { loads: rows, meta }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab.status, equipmentType, debouncedQuery],
  )

  const { data, error, loading } = useResource(fetchLoads, [activeTab.status, equipmentType, debouncedQuery])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.loads.filter((l) => activeTab.match(l))
  }, [data, activeTab])

  const counts = data?.meta?.counts

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Loads</div>
          <div className="page-sub">All loads and their current status</div>
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
            placeholder="Load ID, broker or city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="loads-equip-filter" role="group" aria-label="Filter by equipment type">
          <button
            className={'loads-equip-btn' + (equip === 'all' ? ' active' : '')}
            onClick={() => setEquip('all')}
            aria-pressed={equip === 'all'}
          >
            All
          </button>
          {EQUIPMENT_ORDER.map((key) => {
            const eq = EQUIPMENT_TYPES[key]
            const Icon = eq.icon
            return (
              <button
                key={key}
                className={'loads-equip-btn' + (equip === key ? ' active' : '')}
                onClick={() => setEquip(key)}
                aria-pressed={equip === key}
                title={eq.label}
              >
                <Icon size={14} aria-hidden="true" />
                {eq.label}
              </button>
            )
          })}
        </div>

        <div className="page-toolbar-spacer" />
        <div className="page-result-count">{loading ? '…' : `${filtered.length} loads`}</div>
      </div>

      <div className="panel load-board">
        <table>
          <thead>
            <tr>
              <th>Load</th>
              <th>Route</th>
              <th>Equipment</th>
              <th>Broker</th>
              <th>Rate</th>
              <th>Pickup</th>
              <th>Delivery</th>
              <th>Driver</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="page-empty">Loading loads…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={10} className="page-empty">Could not load loads — {error.message}</td>
              </tr>
            )}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {filtered.map((load) => (
                  <motion.tr
                    className="row"
                    key={load.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => navigate('/loads/' + load.id)}
                  >
                    <td className="load-id mono">
                      <Link to={'/loads/' + load.id} className="row-primary-link">#{load.id}</Link>
                    </td>
                    <td>
                      <div className="route">
                        {formatPlace(load.originCity, load.originState)} <span className="arrow">→</span> {formatPlace(load.destinationCity, load.destinationState)}
                      </div>
                      <div className="loads-route-sub">{formatDistance(load.distanceMi)}</div>
                    </td>
                    <td>
                      {(() => {
                        const eq = EQUIPMENT_TYPES[load.equipmentType]
                        if (!eq) return null
                        const Icon = eq.icon
                        return (
                          <div className="loads-equip-chip" title={formatEquipment({ equipmentType: load.equipmentType, equipmentLength: `${load.equipmentLengthFt}ft` })}>
                            <Icon size={14} aria-hidden="true" />
                            {eq.label}
                          </div>
                        )
                      })()}
                    </td>
                    <td>{load.broker}</td>
                    <td className="rate mono">{formatMoney(load.rateUsd)}</td>
                    <td className="mono">{formatDateTime(load.pickupAt)}</td>
                    <td className="mono">{formatDateTime(load.deliveryAt)}</td>
                    <td>
                      {load.driver ? (
                        <div className="loads-driver-chip">
                          <span className="loads-driver-dot">{initials(load.driver.name)}</span>
                          {load.driver.name}
                        </div>
                      ) : (
                        <div className="loads-driver-chip unassigned">
                          <span className="loads-driver-dot">—</span>
                          Unassigned
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={'badge ' + load.status}>
                        <span className="dot"></span>
                        {STATUS_LABEL[load.status]}
                      </span>
                    </td>
                    <td className="loads-chevron">›</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="page-empty">No loads match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
