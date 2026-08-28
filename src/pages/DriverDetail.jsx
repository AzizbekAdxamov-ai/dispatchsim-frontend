import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Envelope } from '@phosphor-icons/react'
import { getDriver } from '../api/drivers'
import { useResource } from '../hooks/useResource'
import { getDriverStatus } from '../utils/driverStatus'
import { formatCdl, formatPlace, formatUnit, formatMiles, formatMonthYear, formatMoney, formatEta } from '../utils/format'
import '../components/dashboard/Panel.css'
import './DriverDetail.css'

const STATUS_CLASS = {
  'On route': 'ontime',
  'Available': 'ontime',
  'HOS limit': 'warn',
  'Off duty': 'neutral',
  'Home': 'neutral',
}

// 11h (660 min) is the FMCSA daily driving-hours cap this app models — the
// same ceiling the mock's hand-picked "11h 00m → 100%" example implied.
// See CLAUDE.md's bugfix note: the old code compared driver.hos as a
// STRING ('11h 00m' === '11h 00m'); this replaces that with real math on
// the raw hosRemainingMin minutes.
const MAX_HOS_MIN = 660

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: driver, error, loading } = useResource((signal) => getDriver(id, signal), [id])

  if (loading) {
    return <div className="panel driver-detail-missing"><p>Loading driver…</p></div>
  }

  if (error?.code === 'DRIVER_NOT_FOUND') {
    return (
      <div className="panel driver-detail-missing">
        <p>Driver not found.</p>
        <Link to="/drivers">← Back to Drivers</Link>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="panel driver-detail-missing">
        <p>Could not load driver{error ? ` — ${error.message}` : ''}.</p>
        <Link to="/drivers">← Back to Drivers</Link>
      </div>
    )
  }

  const status = getDriverStatus(driver)
  const history = driver.recentLoads ?? []
  const currentLoad = driver.currentLoad
  const hosPct = driver.hosRemainingMin != null ? Math.max(0, Math.min(100, Math.round((driver.hosRemainingMin / MAX_HOS_MIN) * 100))) : 0

  return (
    <div>
      <div className="driver-detail-crumbs">
        <button className="driver-detail-back" onClick={() => navigate('/drivers')}>← Drivers</button>
        <span className="driver-detail-sep">/</span>
        <span className="driver-detail-crumb-current">{driver.name}</span>
      </div>

      <div className="driver-detail-head">
        <div className="driver-detail-id-row">
          <div className="driver-detail-avatar">{initials(driver.name)}</div>
          <div>
            <div className="driver-detail-title-row">
              <div className="driver-detail-name">{driver.name}</div>
              <span className={'badge ' + (STATUS_CLASS[status.status] ?? 'neutral')}>
                <span className="dot"></span>
                {status.status}
              </span>
            </div>
            <div className="driver-detail-sub">{formatCdl(driver.cdlClass, driver.cdlNumber)} &nbsp;·&nbsp; {formatUnit(driver.truck)} &nbsp;·&nbsp; {formatPlace(driver.homeBaseCity, driver.homeBaseState)}</div>
          </div>
        </div>
        <div className="driver-detail-actions">
          <button className="driver-detail-btn">
            <Phone size={14} aria-hidden="true" /> Call
          </button>
          <button className="driver-detail-btn primary">
            <Envelope size={14} aria-hidden="true" /> Message
          </button>
        </div>
      </div>

      <div className="driver-detail-grid">
        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Driver details</div></div>
            <div className="dd-detail-body">
              <div className="dd-detail-grid">
                <div><div className="dd-detail-label">Phone</div><div className="dd-detail-value mono">{driver.phone}</div></div>
                <div><div className="dd-detail-label">Email</div><div className="dd-detail-value">{driver.email}</div></div>
                <div><div className="dd-detail-label">CDL</div><div className="dd-detail-value mono">{formatCdl(driver.cdlClass, driver.cdlNumber)}</div></div>
                <div><div className="dd-detail-label">License expires</div><div className="dd-detail-value">{formatMonthYear(driver.licenseExpiresOn)}</div></div>
                <div><div className="dd-detail-label">Home base</div><div className="dd-detail-value">{formatPlace(driver.homeBaseCity, driver.homeBaseState)}</div></div>
                <div><div className="dd-detail-label">Assigned unit</div><div className="dd-detail-value">{formatUnit(driver.truck)}</div></div>
                <div><div className="dd-detail-label">Total miles</div><div className="dd-detail-value mono">{formatMiles(driver.totalMiles)}</div></div>
                <div><div className="dd-detail-label">Safety rating</div><div className="dd-detail-value mono">{driver.safetyRating} / 100</div></div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Load history</div></div>
            {history.length > 0 ? (
              <motion.div variants={listContainer} initial="hidden" animate="show">
                {history.map((l) => (
                  <motion.div className="dd-history-row" key={l.id} variants={listItem}>
                    <div className="dd-history-id mono">#{l.id}</div>
                    <div className="dd-history-route">{formatPlace(l.originCity, l.originState)} <span className="arrow">→</span> {formatPlace(l.destinationCity, l.destinationState)}</div>
                    <div className="dd-history-broker">{l.broker}</div>
                    <div className="loads-chevron">›</div>
                    <Link to={'/loads/' + l.id} className="dd-stretched-link" aria-label={'Open load #' + l.id}></Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="dd-empty">No load history yet.</div>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Hours of service</div></div>
            <div className="dd-hos-body">
              <div className={'dd-hos-val mono' + (status.state === 'hos' ? ' amber' : '')}>{status.hos}</div>
              <div className="dd-hos-lbl">{status.hosLabel}</div>
              <div className="dd-hos-track">
                <div
                  className={'dd-hos-fill' + (status.state === 'hos' ? ' amber' : '')}
                  style={{ width: (driver.dutyStatus === 'off' ? 0 : hosPct) + '%' }}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Current load</div></div>
            {currentLoad ? (
              <div className="dd-current-load">
                <div className="dd-current-load-id mono">#{currentLoad.id}</div>
                <div className="dd-history-route">{formatPlace(currentLoad.originCity, currentLoad.originState)} <span className="arrow">→</span> {formatPlace(currentLoad.destinationCity, currentLoad.destinationState)}</div>
                <div className="dd-current-load-eta">{formatEta(currentLoad.etaAt, currentLoad.deliveryAt) ?? formatMoney(currentLoad.rateUsd)}</div>
                <Link to={'/loads/' + currentLoad.id} className="dd-stretched-link" aria-label={'Open load #' + currentLoad.id}></Link>
              </div>
            ) : (
              <div className="dd-empty">Not currently on a load.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
