import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { listPostings } from '../api/loadBoard'
import { useResource } from '../hooks/useResource'
import { EQUIPMENT_TYPES } from '../data/equipmentTypes'
import {
  formatPlace,
  formatDistance,
  formatMoney,
  formatDateTime,
  formatRatePerMile,
  formatDeadhead,
} from '../utils/format'
import PostingFilters from '../components/loadboard/PostingFilters'
import PostingDetail from '../components/loadboard/PostingDetail'
import '../components/dashboard/Panel.css'
import '../components/loadboard/PostingFilters.css'
import './PageHeader.css'
import './LoadBoard.css'

const PAGE_SIZE = 50

function ageLabel(iso) {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return 'just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}

function deadheadClass(mi) {
  if (mi == null) return ''
  if (mi <= 100) return 'lb-dh-green'
  if (mi <= 250) return 'lb-dh-amber'
  return 'lb-dh-red'
}

const STORAGE_KEY = 'lb-filters'

function loadSavedFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveFilters(filters) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters)) } catch {}
}

export default function LoadBoard() {
  const [filters, setFilters] = useState(() => ({ sort: 'posted', ...loadSavedFilters() }))
  const [selected, setSelected] = useState(null)

  const fetchPostings = useCallback(
    async (signal) => {
      return listPostings(
        {
          equipmentType: filters.equipmentType,
          originState: filters.originState,
          originZone: filters.originZone,
          destinationZone: filters.destinationZone,
          fromCity: filters.fromCity,
          fromState: filters.fromState,
          sort: filters.sort,
          limit: PAGE_SIZE,
        },
        signal,
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.equipmentType, filters.originState, filters.originZone, filters.destinationZone, filters.fromCity, filters.fromState, filters.sort],
  )

  const { data, error, loading, refetch } = useResource(fetchPostings, [
    filters.equipmentType,
    filters.originState,
    filters.originZone,
    filters.destinationZone,
    filters.fromCity,
    filters.fromState,
    filters.sort,
  ])

  function handleFiltersChange(f) {
    setFilters(f)
    saveFilters(f)
  }

  const postings = useMemo(() => {
    if (!data?.postings) return []
    const q = (filters.search || '').trim().toLowerCase()
    if (!q) return data.postings
    return data.postings.filter(
      (p) =>
        (p.broker || '').toLowerCase().includes(q) ||
        (p.originCity || '').toLowerCase().includes(q) ||
        (p.destinationCity || '').toLowerCase().includes(q) ||
        (p.commodity || '').toLowerCase().includes(q),
    )
  }, [data, filters.search])

  function handleBooked() {
    setSelected(null)
    refetch()
  }

  function handleExpired() {
    setSelected(null)
    refetch()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Load board</div>
          <div className="page-sub">Available postings from brokers</div>
        </div>
      </div>

      <PostingFilters filters={filters} onChange={handleFiltersChange} />

      <div className="lb-result-count">
        {loading ? '…' : `${postings.length} posting${postings.length !== 1 ? 's' : ''}`}
      </div>

      <div className="panel lb-panel">
        <table>
          <thead>
            <tr>
              <th>Age</th>
              <th>Route</th>
              <th>{data?.meta?.deadheadFrom?.kind === 'location'
                ? `Deadhead — ${data.meta.deadheadFrom.city}, ${data.meta.deadheadFrom.state}`
                : data?.meta?.deadheadFrom?.kind === 'driver'
                  ? `Deadhead — ${data.meta.deadheadFrom.driverName}`
                  : 'Deadhead'}</th>
              <th>Equipment</th>
              <th>Rate</th>
              <th>$/mi</th>
              <th>Pickup</th>
              <th>Broker</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="page-empty">Loading postings…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={10} className="page-empty">Could not load postings — {error.message}</td>
              </tr>
            )}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {postings.map((p) => {
                  const eq = EQUIPMENT_TYPES[p.equipmentType]
                  return (
                    <motion.tr
                      className="row"
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      onClick={() => setSelected(p)}
                    >
                      <td className="lb-age mono">{ageLabel(p.postedAt)}</td>
                      <td>
                        <div className="route">
                          {formatPlace(p.originCity, p.originState)}{' '}
                          <span className="arrow">→</span>{' '}
                          {formatPlace(p.destinationCity, p.destinationState)}
                        </div>
                        <div className="lb-route-sub">{formatDistance(p.distanceMi)}</div>
                      </td>
                      <td className={'mono ' + deadheadClass(p.deadheadMi)}>
                        {formatDeadhead(p.deadheadMi)}
                      </td>
                      <td>
                        {eq ? (
                          <div className="lb-equip-chip">
                            <eq.icon size={14} aria-hidden="true" />
                            {eq.label}
                          </div>
                        ) : (
                          p.equipmentType
                        )}
                      </td>
                      <td className="rate mono">{formatMoney(p.rateUsd)}</td>
                      <td className="mono">{formatRatePerMile(p.rateUsd, p.distanceMi)}</td>
                      <td className="mono">{formatDateTime(p.pickupAt)}</td>
                      <td>{p.broker}</td>
                      <td className="mono">{formatDateTime(p.expiresAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="lb-book-mini"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(p)
                          }}
                        >
                          Book
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
            {!loading && !error && postings.length === 0 && (
              <tr>
                <td colSpan={10} className="page-empty">No postings match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selected && (
          <PostingDetail
            posting={selected}
            onClose={() => setSelected(null)}
            onBooked={handleBooked}
            onExpired={handleExpired}
          />
        )}
      </AnimatePresence>
    </>
  )
}
