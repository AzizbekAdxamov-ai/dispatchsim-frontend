import { useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Envelope, Phone, FileText, Check, Warning } from '@phosphor-icons/react'
import { STATUS_LABEL } from '../data/mockData'
import { EQUIPMENT_TYPES, formatEquipment } from '../data/equipmentTypes'
import { useTheme } from '../theme/ThemeProvider'
import { getLoad } from '../api/loads'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatWeight, formatDateTime, formatCdl, formatHos, formatPlace, formatDistance } from '../utils/format'
import '../components/dashboard/Panel.css'
import './LoadDetail.css'

gsap.registerPlugin(useGSAP)

// `timeline[]` from the API carries structure (step key + timestamp +
// state), never display text — see lib/loadTimeline.js's header comment.
// This is the only place those keys turn into English labels.
const STEP_LABEL = {
  booked: 'Booked',
  dispatched: 'Dispatched',
  inTransit: 'In Transit',
  delivered: 'Delivered',
}

function timelineTime(step, load) {
  if (step.at) return formatDateTime(step.at)
  if (step.step === 'inTransit' && step.state === 'current') return `Now — ${load.progress}%`
  if (step.step === 'delivered' && load.status === 'crit') return 'Running late'
  return 'Pending'
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

export default function LoadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pageRef = useRef(null)
  const { theme } = useTheme()

  const { data: load, error, loading } = useResource((signal) => getLoad(id, signal), [id])

  useGSAP(() => {
    if (!load) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ delay: 0.1 })
      tl.from('.ld-tl-step', {
        opacity: 0,
        y: 10,
        scale: 0.9,
        duration: 0.35,
        stagger: 0.12,
        ease: 'back.out(1.6)',
      })
      tl.from('.ld-progress-fill', { width: 0, duration: 0.6, ease: 'power2.out' }, '-=0.2')

      gsap.to('.ld-map-route', {
        strokeDashoffset: -12,
        duration: 1.2,
        repeat: -1,
        ease: 'none',
      })
    })
  }, { scope: pageRef, dependencies: [load?.id] })

  if (loading) {
    return <div className="panel load-detail-missing"><p>Loading load #{id}…</p></div>
  }

  if (error?.code === 'LOAD_NOT_FOUND') {
    return (
      <div className="panel load-detail-missing">
        <p>Load #{id} not found.</p>
        <Link to="/loads">← Back to Loads</Link>
      </div>
    )
  }

  if (error || !load) {
    return (
      <div className="panel load-detail-missing">
        <p>Could not load load #{id}{error ? ` — ${error.message}` : ''}.</p>
        <Link to="/loads">← Back to Loads</Link>
      </div>
    )
  }

  const equip = EQUIPMENT_TYPES[load.equipmentType]
  const EquipIcon = equip?.icon
  const truckImg = equip ? (theme === 'dark' ? equip.image.dark : equip.image.light) : null
  const originLabel = formatPlace(load.originCity, load.originState)
  const destinationLabel = formatPlace(load.destinationCity, load.destinationState)
  const hosAlert =
    load.driver && load.status !== 'done' && load.driver.hosRemainingMin != null && load.driver.hosRemainingMin <= 60
      ? `Driver has ${formatHos(load.driver.hosRemainingMin)} left before mandatory rest`
      : null

  return (
    <div ref={pageRef}>
      <div className="load-detail-crumbs">
        <button className="load-detail-back" onClick={() => navigate('/loads')}>← Loads</button>
        <span className="load-detail-sep">/</span>
        <span className="load-detail-crumb-current">#{load.id}</span>
      </div>

      <div className="load-detail-head">
        <div>
          <div className="load-detail-title-row">
            <div className="load-detail-id mono">Load #{load.id}</div>
            <span className={'badge ' + load.status + ' load-detail-status-pill'}>
              <span className="dot"></span>
              {STATUS_LABEL[load.status]}
            </span>
          </div>
          <div className="load-detail-route">
            {originLabel} <b>→</b> {destinationLabel} &nbsp;·&nbsp; <b>{formatDistance(load.distanceMi)}</b> &nbsp;·&nbsp; {load.broker}
          </div>
        </div>
        <div className="load-detail-actions">
          <button className="load-detail-btn" disabled={!load.driver}>
            <Envelope size={14} aria-hidden="true" /> Message driver
          </button>
          <button className="load-detail-btn primary">
            <Phone size={14} aria-hidden="true" /> Call broker
          </button>
        </div>
      </div>

      <div className="load-detail-timeline">
        {load.timeline.map((step, i) => (
          <div className={'ld-tl-step ' + step.state} key={step.step}>
            {i < load.timeline.length - 1 && <div className="ld-tl-line" />}
            <div className="ld-tl-dot">{step.state === 'done' ? <Check size={13} weight="bold" aria-hidden="true" /> : step.state === 'current' ? '●' : i + 1}</div>
            <div className="ld-tl-label">{STEP_LABEL[step.step]}</div>
            <div className="ld-tl-time">{timelineTime(step, load)}</div>
          </div>
        ))}
      </div>

      <div className="load-detail-grid">
        <div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Load details</div></div>
            <div className="ld-detail-body">
              <div className="ld-detail-grid">
                <div><div className="ld-detail-label">Broker</div><div className="ld-detail-value">{load.broker}</div></div>
                <div><div className="ld-detail-label">Rate</div><div className="ld-detail-value mono">{formatMoney(load.rateUsd)}</div></div>
                <div><div className="ld-detail-label">Pickup</div><div className="ld-detail-value">{formatDateTime(load.pickupAt)} — {originLabel}</div></div>
                <div><div className="ld-detail-label">Delivery</div><div className="ld-detail-value">{formatDateTime(load.deliveryAt)} — {destinationLabel}</div></div>
                <div><div className="ld-detail-label">Weight</div><div className="ld-detail-value mono">{formatWeight(load.weightLbs)}</div></div>
                <div><div className="ld-detail-label">Equipment</div><div className="ld-detail-value">{formatEquipment({ equipmentType: load.equipmentType, equipmentLength: `${load.equipmentLengthFt}ft` })}</div></div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Documents</div></div>
            {/* Document generation/upload is out of scope this round (see
                CLAUDE.md's C13 mock-trim plan) — every load shows the same
                empty state rather than fabricated per-load files. */}
            <div className="ld-driver-empty">No documents uploaded yet.</div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Broker chat</div></div>
            {/* Broker messaging is out of scope this round — see BrokerChat.jsx,
                which is not touched in this pass. */}
            <div className="ld-driver-empty">No messages yet.</div>
          </div>
        </div>

        <div>
          <div className="panel ld-vehicle-panel">
            <div className="panel-head">
              <div className="panel-title">
                Vehicle
                {equip && (
                  <span className="ld-equip-badge">
                    <EquipIcon size={13} aria-hidden="true" />
                    {equip.label}
                  </span>
                )}
              </div>
            </div>
            {equip && (
              <>
                <div className={'ld-vehicle-box' + (equip.themedImage ? ' themed' : '')}>
                  <img className="ld-vehicle-img" src={truckImg} alt={equip.label + ' truck and trailer'} />
                  <span className="ld-vehicle-type-tag">
                    <EquipIcon size={12} aria-hidden="true" />
                    {equip.label}
                  </span>
                </div>
                <div className="ld-vehicle-spec">{formatEquipment({ equipmentType: load.equipmentType, equipmentLength: `${load.equipmentLengthFt}ft` })} · {formatWeight(load.weightLbs)}</div>
              </>
            )}
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Assigned driver</div></div>
            {load.driver ? (
              <div className="ld-driver-card">
                <div className="ld-driver-avatar">{initials(load.driver.name)}</div>
                <div>
                  <div className="ld-driver-name">
                    <Link to={'/drivers/' + load.driver.id} className="row-primary-link">{load.driver.name}</Link>
                  </div>
                  <div className="ld-driver-meta">{formatCdl(load.driver.cdlClass, load.driver.cdlNumber)} · {formatHos(load.driver.hosRemainingMin)} HOS</div>
                </div>
                <div className="ld-driver-actions">
                  <button className="ld-icon-btn-sm" aria-label="Call driver"><Phone size={14} aria-hidden="true" /></button>
                  <button className="ld-icon-btn-sm" aria-label="Message driver"><Envelope size={14} aria-hidden="true" /></button>
                </div>
              </div>
            ) : (
              <div className="ld-driver-empty">No driver assigned yet.</div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Live tracking</div></div>
            <div className="ld-track-body">
              <div className="ld-track-route">
                {originLabel} <b>→</b> {destinationLabel} — <b>{load.progress}%</b> complete
              </div>
              <div className="ld-progress-track">
                <div className="ld-progress-fill" style={{ width: load.progress + '%' }} />
              </div>
              <svg viewBox="0 0 320 140" className="ld-map-svg">
                <defs>
                  <pattern id={'ldMapGrid' + load.id} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-soft)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="320" height="140" fill={'url(#ldMapGrid' + load.id + ')'} />
                <path
                  className="ld-map-route"
                  d="M 30 115 C 80 90, 60 50, 130 45 S 230 30, 290 25"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                />
                <circle cx="30" cy="115" r="5" fill="var(--green)" />
                <circle cx="290" cy="25" r="5" fill="var(--red)" />
              </svg>
              {hosAlert && (
                <div className="ld-hos-strip">
                  <Warning size={14} weight="fill" aria-hidden="true" /> {hosAlert}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
