import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { listApplicants } from '../api/hr'
import { useResource } from '../hooks/useResource'
import { EQUIPMENT_TYPES } from '../data/equipmentTypes'
import { formatPlace, formatDate } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './Drivers.css'
import './HrApplicants.css'

const PAGE_SIZE = 25

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'experience', label: 'Experience' },
  { key: 'expiring', label: 'Expiring soon' },
]

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff
}

export default function HrApplicants() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ sort: 'newest', page: 1 })
  const [query, setQuery] = useState('')

  const { data, error, loading, refreshing } = useResource(
    (signal) =>
      listApplicants(
        {
          cdlClass: filters.cdlClass,
          homeBaseState: filters.homeBaseState,
          minYearsExperience: filters.minYearsExperience,
          desiredEquipment: filters.desiredEquipment,
          sort: filters.sort,
          page: filters.page,
          limit: PAGE_SIZE,
        },
        signal,
      ),
    [filters.cdlClass, filters.homeBaseState, filters.minYearsExperience, filters.desiredEquipment, filters.sort, filters.page],
    { pollMs: 12000 },
  )

  const applicants = useMemo(() => {
    const list = data?.applicants ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (a) =>
        (a.fullName || '').toLowerCase().includes(q) ||
        (a.homeBaseCity || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q),
    )
  }, [data, query])

  const meta = data?.meta

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Applicant market</div>
          <div className="page-sub">Open driver candidates — review documents and hire</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Name, city, email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="hr-filter-select"
          value={filters.cdlClass ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, cdlClass: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Any CDL</option>
          <option value="A">Class A</option>
          <option value="B">Class B</option>
        </select>

        <select
          className="hr-filter-select"
          value={filters.desiredEquipment ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, desiredEquipment: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Any equipment</option>
          {Object.entries(EQUIPMENT_TYPES).map(([key, eq]) => (
            <option key={key} value={key}>{eq.label}</option>
          ))}
        </select>

        <select
          className="hr-filter-select"
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${meta?.total ?? applicants.length} applicant${(meta?.total ?? applicants.length) !== 1 ? 's' : ''}`}
          {refreshing && <span className="hr-refreshing-indicator" title="Refreshing…"> ↻</span>}
        </div>
      </div>

      <div className="panel load-board">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>CDL</th>
              <th>Experience</th>
              <th>Home base</th>
              <th>Equipment</th>
              <th>Endorsements</th>
              <th>License expires</th>
              <th>MVR</th>
              <th>Accidents</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="page-empty">Loading applicants…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={10} className="page-empty">Could not load applicants — {error.message}</td>
              </tr>
            )}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {applicants.map((a) => {
                  const eq = EQUIPMENT_TYPES[a.desiredEquipment]
                  const daysLeft = daysUntil(a.licenseExpiresOn)
                  return (
                    <motion.tr
                      className="row"
                      key={a.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      onClick={() => navigate('/hr/applicants/' + a.id)}
                    >
                      <td>
                        <div className="drivers-name-chip">
                          <span className="loads-driver-dot">{initials(a.fullName)}</span>
                          <div>
                            <Link to={'/hr/applicants/' + a.id} className="drivers-name row-primary-link">{a.fullName}</Link>
                            <div className="drivers-name-sub">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">CDL-{a.cdlClass}</td>
                      <td className="mono">{a.yearsExperience}y</td>
                      <td>{formatPlace(a.homeBaseCity, a.homeBaseState)}</td>
                      <td>
                        {eq ? (
                          <div className="lb-equip-chip">
                            <eq.icon size={14} aria-hidden="true" />
                            {eq.label}
                          </div>
                        ) : (
                          a.desiredEquipment
                        )}
                      </td>
                      <td className="hr-endorsements">
                        {(a.endorsements ?? []).length > 0
                          ? a.endorsements.map((e) => (
                              <span key={e} className="hr-endorsement-tag">{e}</span>
                            ))
                          : <span className="hr-no-endorsement">—</span>
                        }
                      </td>
                      <td className="mono">
                        {formatDate(a.licenseExpiresOn)}
                        {daysLeft != null && (
                          <span className="hr-days-until"> · {daysLeft}d</span>
                        )}
                      </td>
                      <td className="mono">{a.mvrViolations}</td>
                      <td className="mono">{a.preventableAccidents}</td>
                      <td className="loads-chevron">›</td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
            {!loading && !error && applicants.length === 0 && data?.applicants?.length === 0 && (
              <tr>
                <td colSpan={10} className="page-empty">
                  No applicants on the market right now. New candidates appear daily.
                </td>
              </tr>
            )}
            {!loading && !error && applicants.length === 0 && data?.applicants?.length > 0 && (
              <tr>
                <td colSpan={10} className="page-empty">No applicants match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.total > PAGE_SIZE && (
        <div className="hr-pagination">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            ← Previous
          </button>
          <span className="hr-page-info">Page {meta.page} of {Math.ceil(meta.total / PAGE_SIZE)}</span>
          <button
            type="button"
            disabled={filters.page >= Math.ceil(meta.total / PAGE_SIZE)}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next →
          </button>
        </div>
      )}
    </>
  )
}
