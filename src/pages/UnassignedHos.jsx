import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { getUnassignedHos, assignUnassignedHos, annotateUnassignedHos } from '../api/compliance'
import { listDrivers } from '../api/drivers'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { dutyStatusLabel, formatClock } from '../components/compliance/dutyStatus'
import { formatMonthDay } from '../utils/format'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './PageHeader.css'
import './DriverHos.css'
import './UnassignedHos.css'

// Compliance > Unassigned HOS. The records the ELD wrote while nobody was
// signed in -- a truck moved between loads, the engine knows it moved, the
// log does not know who drove. 49 CFR 395.32 makes reviewing them the
// carrier's job, and the review is one of two things: assign the drive to
// the driver who actually made it, or annotate it with why it is nobody's
// time. Facts and the rule; the carrier's decision happens here.

const POLL_MS = 5000

function timeOfDay(iso, dayStartMs, dayEndMs) {
  const t = new Date(iso).getTime()
  const span = dayEndMs - dayStartMs
  const min = Math.round(((t - dayStartMs) / span) * 24 * 60)
  if (min < 0) return 'prev day'
  if (min >= 24 * 60) return 'next day'
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function reviewErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'EVENT_ALREADY_REVIEWED') return 'This record has already been reviewed.'
    if (err.code === 'DRIVER_NOT_FOUND') return 'This driver is no longer on the roster.'
    if (err.code === 'VALIDATION_ERROR') return 'The note must be between 4 and 60 characters.'
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  }
  return 'Something went wrong. Please try again.'
}

// The review form for one record: who drove (assign only) and the note
// that says why -- the note is the review, 4..60 characters, the same
// window the ELD standard and the database both enforce.
function ReviewEditor({ mode, drivers, saving, error, onSave, onCancel }) {
  const [driverId, setDriverId] = useState('')
  const [note, setNote] = useState('')
  const ready = note.trim().length >= 4 && (mode !== 'assign' || driverId !== '')

  return (
    <div className="hos-review-editor">
      {mode === 'assign' && (
        <label className="hos-review-field">
          <span>Driver</span>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Who drove this truck…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      )}
      <label className="hos-review-field">
        <span>Note ({note.trim().length}/60)</span>
        <textarea
          rows={2}
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'assign' ? 'Why the record changed…' : 'Why this drive is not a driver\'s time…'}
        />
      </label>
      {error && <div className="hos-review-error" role="alert">{error}</div>}
      <div className="hos-actions">
        <button type="button" className="hos-action-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="hos-action-btn hos-action-primary" onClick={() => onSave({ driverId, note: note.trim() })} disabled={!ready || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function UnassignedHos() {
  const { data, error, loading, refetch } = useResource((signal) => getUnassignedHos(signal), [], { pollMs: POLL_MS })
  const { data: driversData } = useResource((signal) => listDrivers(signal), [])
  const drivers = driversData?.drivers ?? []

  const [open, setOpen] = useState(() => new Set())
  // The record being reviewed and how: 'assign' names a driver, 'annotate'
  // explains the drive. One editor at a time -- two open forms on one
  // screen would both claim to be the review.
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const rows = data?.days ?? []

  function toggleRow(key) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function closeEditor() {
    setEditing(null)
    setActionError('')
  }

  async function handleSave({ driverId, note }) {
    if (!editing) return
    setSaving(true)
    setActionError('')
    try {
      if (editing.mode === 'assign') {
        await assignUnassignedHos(editing.eventId, { driverId, annotation: note })
      } else {
        await annotateUnassignedHos(editing.eventId, { annotation: note })
      }
      closeEditor()
      refetch()
    } catch (err) {
      setActionError(reviewErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Unassigned HOS</div>
          <div className="page-sub">Driving recorded with no driver signed in · 49 CFR 395.32</div>
        </div>
      </div>

      <div className="panel load-board hos-table">
        <table>
          <thead>
            <tr>
              <th className="hos-expand-col" aria-label="Expand" />
              <th>Vehicle</th>
              <th>Day</th>
              <th>Records</th>
              <th>Unreviewed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="page-empty">Loading the review queue…</td></tr>}
            {!loading && error && <tr><td colSpan={6} className="page-empty">Could not load the review queue — {error.message}</td></tr>}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="page-empty">
                  Nothing to review. Records appear here when a truck is driven with no driver signed in —
                  the empty move between one load and the next.
                </td>
              </tr>
            )}
            {!loading && !error && rows.map((d) => {
              const key = `${d.truck.id} ${d.day}`
              const isOpen = open.has(key)
              return (
                <Fragment key={key}>
                  <tr className="row" onClick={() => toggleRow(key)} aria-expanded={isOpen}>
                    <td className="hos-muted">{isOpen ? <CaretDown size={13} /> : <CaretRight size={13} />}</td>
                    <td className="mono">{d.truck.id}</td>
                    <td>{formatMonthDay(d.dayStart)}</td>
                    <td className="mono">{d.segments.length}</td>
                    <td className="mono">{d.unreviewed > 0 ? d.unreviewed : '—'}</td>
                    <td className="hos-link-cell">
                      <Link to="/tracking" onClick={(e) => e.stopPropagation()}>Vehicle map</Link>
                    </td>
                  </tr>
                  {isOpen && d.segments.map((s) => {
                    const isEditing = editing?.eventId === s.id
                    return (
                      <Fragment key={s.id}>
                        <tr className="hos-violation-detail">
                          <td />
                          <td colSpan={3}>
                            <span className="badge neutral"><span className="dot"></span>{dutyStatusLabel(s.status)}</span>
                            <span className="mono hos-segment-time">
                              {timeOfDay(s.startedAt, d.dayStart, d.dayEnd)} – {timeOfDay(s.endedAt, d.dayStart, d.dayEnd)}
                            </span>
                            <span className="mono">{formatClock(s.minutes)}</span>
                            {s.loadId && <Link to={`/loads/${s.loadId}`}>#{s.loadId}</Link>}
                          </td>
                          <td>
                            {s.awaitingReview
                              ? <span className="hos-muted">Unreviewed</span>
                              : <span className="hos-annotation">“{s.annotation}”</span>}
                          </td>
                          <td className="hos-actions">
                            {s.awaitingReview && !isEditing && (
                              <>
                                <button
                                  type="button"
                                  className="hos-action-btn"
                                  onClick={() => { setEditing({ eventId: s.id, mode: 'assign' }); setActionError('') }}
                                >
                                  Assign
                                </button>
                                <button
                                  type="button"
                                  className="hos-action-btn"
                                  onClick={() => { setEditing({ eventId: s.id, mode: 'annotate' }); setActionError('') }}
                                >
                                  Annotate
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className="hos-violation-detail">
                            <td colSpan={6}>
                              <ReviewEditor
                                mode={editing.mode}
                                drivers={drivers}
                                saving={saving}
                                error={actionError}
                                onSave={handleSave}
                                onCancel={closeEditor}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hos-footnote">
        The ELD records driving from the engine, so a truck moved with nobody signed in is still a record.
        Assign names the driver who actually drove — the record then moves into their log. Annotate keeps
        the record as it is and says why it is not a driver&apos;s time. Times are hours of service.
      </div>
    </>
  )
}
