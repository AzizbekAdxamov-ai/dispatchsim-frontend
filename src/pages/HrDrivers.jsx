import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { listDrivers } from '../api/drivers'
import { useResource } from '../hooks/useResource'
import { getDriverStatus } from '../utils/driverStatus'
import { formatUnit, formatPlace } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './Drivers.css'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function HrDrivers() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data, error, loading, refreshing } = useResource(
    (signal) => listDrivers(signal),
    [],
    { pollMs: 15000 },
  )

  const enriched = useMemo(() => {
    if (!data) return []
    return data.drivers.map((d) => ({ ...d, ...getDriverStatus(d) }))
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter((d) => {
      const home = formatPlace(d.homeBaseCity, d.homeBaseState).toLowerCase()
      const unit = (d.truck?.id ?? '').toLowerCase()
      return d.name.toLowerCase().includes(q) || home.includes(q) || unit.includes(q)
    })
  }, [enriched, query])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Hired drivers</div>
          <div className="page-sub">Drivers hired from the applicant market</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Driver name, home base or unit..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">
          {loading ? '…' : `${filtered.length} driver${filtered.length !== 1 ? 's' : ''}`}
          {refreshing && <span className="hr-refreshing-indicator" title="Refreshing…"> ↻</span>}
        </div>
      </div>

      <div className="panel load-board">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Status</th>
              <th>Home base</th>
              <th>Unit</th>
              <th>Current load</th>
              <th>HOS</th>
              <th>Safety rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="page-empty">Loading drivers…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={8} className="page-empty">Could not load drivers — {error.message}</td>
              </tr>
            )}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {filtered.map((driver) => (
                  <motion.tr
                    className="row"
                    key={driver.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => navigate('/drivers/' + driver.id)}
                  >
                    <td>
                      <div className="drivers-name-chip">
                        <span className="loads-driver-dot">{initials(driver.name)}</span>
                        <div>
                          <Link to={'/drivers/' + driver.id} className="drivers-name row-primary-link">{driver.name}</Link>
                          <div className="drivers-name-sub">{driver.cdlClass ? `CDL-${driver.cdlClass} · ${driver.cdlNumber}` : '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={'badge ' + ({ 'On route': 'ontime', 'Available': 'ontime', 'HOS limit': 'warn', 'Off duty': 'neutral', 'Home': 'neutral' }[driver.status] ?? 'neutral')}>
                        <span className="dot"></span>
                        {driver.status}
                      </span>
                    </td>
                    <td>{formatPlace(driver.homeBaseCity, driver.homeBaseState)}</td>
                    <td className="mono">{formatUnit(driver.truck)}</td>
                    <td className="mono">{driver.currentLoad ? '#' + driver.currentLoad.id : '—'}</td>
                    <td className={'mono' + (driver.state === 'hos' ? ' drivers-hos-amber' : '')}>{driver.hos}</td>
                    <td className="mono">{driver.safetyRating}</td>
                    <td className="loads-chevron">›</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
            {!loading && !error && filtered.length === 0 && data?.drivers?.length === 0 && (
              <tr>
                <td colSpan={8} className="page-empty">
                  No one has been hired yet — start from the applicant market.
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && data?.drivers?.length > 0 && (
              <tr>
                <td colSpan={8} className="page-empty">No drivers match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
