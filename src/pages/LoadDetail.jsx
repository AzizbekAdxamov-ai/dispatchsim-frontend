import { useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Check, Warning } from '@phosphor-icons/react'
import { STATUS_LABEL } from '../data/mockData'
import { EQUIPMENT_TYPES, formatEquipment } from '../data/equipmentTypes'
import { useTheme } from '../theme/ThemeProvider'
import { getLoad, cancelDispatch } from '../api/loads'
import { downloadBol, downloadPod } from '../api/documents'
import { ApiError } from '../api/client'
import DispatchPanel from '../components/loads/DispatchPanel'
import RoadEventPanel from '../components/loads/RoadEventPanel'
import { liveTrackingLines } from '../components/loads/liveTrackingLines'
import { factText } from '../components/loads/factText'
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

// Shown once a load is dispatched, under its appointments.
const RUN_CLOCK_NOTE = 'Appointments are the broker\'s dates. The run itself is timed from the dispatch on the company clock — its arrival and the promise are in the Trip plan.'

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

  // Polled: a load in transit is delivered by a background tick, not by
  // anything on this page, so without this the status would sit stale
  // until the user reloaded.
  // Undoing a dispatch. A load sent to the wrong driver used to have no
  // way back — 'ontime' led only to the tick, and the tick only to 'done'.
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  // BOL/POD downloads used to fire and forget -- a network blip or a 409
  // left the click with no visible result. Same catch-and-offer-retry
  // pattern as Documents.jsx's DocAction, adapted to a single named button
  // instead of a table row's icon slot.
  const [bolDownload, setBolDownload] = useState({ busy: false, failed: false })
  const [podDownload, setPodDownload] = useState({ busy: false, failed: false })

  async function handleDocDownload(downloadFn, loadId, setState) {
    setState({ busy: true, failed: false })
    try {
      await downloadFn(loadId)
      setState({ busy: false, failed: false })
    } catch {
      setState({ busy: false, failed: true })
    }
  }

  const { data: load, error, loading, refetch } = useResource(
    (signal) => getLoad(id, signal), [id], { pollMs: 15000 },
  )

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

  async function handleCancel() {
    if (cancelling) return
    setCancelError('')
    setCancelling(true)
    try {
      await cancelDispatch(id)
      refetch()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setCancelError(
        err instanceof ApiError && err.code === 'LOAD_NOT_CANCELLABLE'
          ? 'This load has already been delivered.'
          : err?.message || 'Could not take the load back.',
      )
    } finally {
      setCancelling(false)
    }
  }

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
        {/* "Message driver" and "Call broker" lived here with no onClick
            and no endpoint behind either of them — one of twenty-two dead
            controls an audit found across the app on 2026-09-08. A button
            that looks live and does nothing teaches a student that the
            software is broken, which is the one lesson this is not for.
            They come back when there is something behind them. */}
      </div>

      {/* Above the timeline on purpose: while an event is open the truck
          is not moving, so the timeline below it is describing a run that
          has stopped. The decision comes first. */}
      <RoadEventPanel loadId={load.id} onResolved={refetch} />

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
          {/* The plan the law wrote at dispatch, and everything it concluded
              since: the fact list from replans and road events, the legal
              arrival beside the broker's promise (two facts, no verdict),
              and the stops the plan makes. Rendered only when the run is
              planned -- before dispatch there is no plan to show. */}
          {load.stopPlanStatus && load.dispatchedAt && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Trip plan</div>
                <span className={'badge ' + (load.etaAt && load.promisedEtaAt && new Date(load.etaAt) > new Date(load.promisedEtaAt) ? 'warn' : 'ontime')}>
                  <span className="dot" />
                  {load.etaAt && load.promisedEtaAt && new Date(load.etaAt) > new Date(load.promisedEtaAt) ? 'Arrives after the promise' : 'Arrives within the promise'}
                </span>
              </div>
              <div className="ld-tripplan-body">
                <div className="ld-tripplan-eta">
                  <div className="ld-tripplan-eta-row">
                    <div className="ld-detail-label">Legal arrival</div>
                    <div className="ld-detail-value mono">{formatDateTime(load.etaAt)}</div>
                  </div>
                  <div className="ld-tripplan-eta-row">
                    <div className="ld-detail-label">Promised to broker</div>
                    <div className="ld-detail-value mono">{formatDateTime(load.promisedEtaAt)}</div>
                  </div>
                </div>
                {(load.stopPlanFacts ?? []).length > 0 && (
                  <ul className="ld-tripplan-facts">
                    {load.stopPlanFacts.map((f, i) => (
                      <li key={i}>
                        {f.cfr && <span className="ld-tripplan-cfr mono">{f.cfr}</span>}
                        <span>{factText(f.detail)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(load.plannedStops ?? []).length > 0 && (
                  <div className="ld-tripplan-stops">
                    <div className="ld-tripplan-stops-head">Planned stops</div>
                    {load.plannedStops.map((s, i) => (
                      <div className="ld-tripplan-stop" key={i}>
                        <span className="ld-tripplan-stop-mile mono">mi {s.mile}</span>
                        <span className="ld-tripplan-stop-name">
                          {s.facility ? `${s.facility.name} · ${s.facility.city}, ${s.facility.state}` : 'Roadside'}
                        </span>
                        <span className={'ld-tripplan-stop-reason' + (s.reason === 'rest' ? ' rest' : '')}>{s.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Load details</div></div>
            <div className="ld-detail-body">
              <div className="ld-detail-grid">
                <div><div className="ld-detail-label">Broker</div><div className="ld-detail-value">{load.broker}</div></div>
                <div><div className="ld-detail-label">Rate</div><div className="ld-detail-value mono">{formatMoney(load.rateUsd)}</div></div>
                {/* The broker's appointments, from the posting -- the dates the
                    rate confirmation and the broker chat use. A dispatched run
                    is timed from the dispatch on the company clock instead, so
                    on 2026-10-08 this panel said "Delivery Oct 8" beside a Trip
                    plan arriving Oct 6. Both are true; the labels now say which
                    is which. */}
                <div><div className="ld-detail-label">Pickup appointment</div><div className="ld-detail-value">{formatDateTime(load.pickupAt)} — {originLabel}</div></div>
                <div><div className="ld-detail-label">Delivery appointment</div><div className="ld-detail-value">{formatDateTime(load.deliveryAt)} — {destinationLabel}</div></div>
                <div><div className="ld-detail-label">Weight</div><div className="ld-detail-value mono">{formatWeight(load.weightLbs)}</div></div>
                <div><div className="ld-detail-label">Equipment</div><div className="ld-detail-value">{formatEquipment({ equipmentType: load.equipmentType, equipmentLength: `${load.equipmentLengthFt}ft` })}</div></div>
              </div>
              {load.dispatchedAt && (
                <div className="ld-detail-note">
                  {RUN_CLOCK_NOTE}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Documents</div></div>
            {/* Generated from the load's own events, not uploaded: the BOL
                exists once the run started, the POD once it ended. A
                document that certifies an event that has not happened is
                refused by the API, so each action gates on the same fact. */}
            {load.dispatchedAt ? (
              <div className="ld-docs-row">
                <button
                  type="button"
                  className={'ld-doc-btn' + (bolDownload.failed ? ' failed' : '')}
                  disabled={bolDownload.busy}
                  onClick={() => handleDocDownload(downloadBol, load.id, setBolDownload)}
                  title={bolDownload.failed
                    ? 'Download failed — click to retry'
                    : "Bill of lading — the shipper's paperwork for freight going ON the truck"}
                >
                  {bolDownload.busy ? 'BOL · Downloading…' : bolDownload.failed ? 'BOL · Retry download' : 'BOL · Bill of lading'}
                </button>
                {load.deliveredAt && (
                  <button
                    type="button"
                    className={'ld-doc-btn' + (podDownload.failed ? ' failed' : '')}
                    disabled={podDownload.busy}
                    onClick={() => handleDocDownload(downloadPod, load.id, setPodDownload)}
                    title={podDownload.failed
                      ? 'Download failed — click to retry'
                      : 'Proof of delivery — signed when the freight came OFF the truck'}
                  >
                    {podDownload.busy ? 'POD · Downloading…' : podDownload.failed ? 'POD · Retry download' : 'POD · Proof of delivery'}
                  </button>
                )}
              </div>
            ) : (
              <div className="ld-driver-empty">Paperwork appears once the load is dispatched.</div>
            )}
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
                  {load.status !== 'done' && (
                    <button
                      type="button"
                      className="ld-cancel-btn"
                      disabled={cancelling}
                      onClick={handleCancel}
                    >
                      {cancelling ? 'Cancelling…' : 'Take load back'}
                    </button>
                  )}
                  {cancelError && <div className="ld-cancel-error" role="alert">{cancelError}</div>}
                </div>
                {/* Call and Message are gone: neither had a handler, and a
                    control that looks live and does nothing is worse than
                    no control. What belongs here is the one action that
                    actually exists — taking the load back. */}
              </div>
            ) : load.status === 'neutral' ? (
              /* A booked load with nobody on it. Until this existed, a load
                 accepted from a rate confirmation sat here forever: nothing
                 dispatched it, so it never delivered and never got paid.
                 Only drivers who have a truck can be picked — hiring and
                 buying are two separate decisions, and the empty list is
                 what says so. */
              <DispatchPanel load={load} onDispatched={refetch} />
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
              {/* Was a drawn curve, the same on every load, with no truck on
                  it. These lines are the map's own position (tracking, from
                  the backend's liveTracking.js) said in words. */}
              {liveTrackingLines(load.tracking, load).map((line, i) => (
                <div key={line} className={i === 0 ? 'ld-track-line lead' : 'ld-track-line'}>{line}</div>
              ))}
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
