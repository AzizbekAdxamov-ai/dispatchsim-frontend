import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Warning, CheckCircle } from '@phosphor-icons/react'
import { ApiError } from '../../api/client'
import { bookPosting } from '../../api/loadBoard'
import { EQUIPMENT_TYPES } from '../../data/equipmentTypes'
import {
  formatPlace,
  formatDistance,
  formatMoney,
  formatDateTime,
  formatRatePerMile,
  formatDeadhead,
  formatWeight,
  formatHos,
} from '../../utils/format'
import './PostingDetail.css'

const WARNING_TEXT = {
  'no-matching-equipment': 'No truck in the fleet is set up for this trailer type.',
  'no-available-driver': 'No driver is free for this pickup right now.',
  'tight-pickup-window': 'The nearest driver may not reach this pickup within their remaining hours.',
}

const ERROR_MESSAGES = {
  POSTING_TAKEN: 'This load was already booked by another dispatcher.',
  POSTING_EXPIRED: 'This posting has expired.',
  POSTING_NOT_FOUND: 'This posting is no longer available.',
}

function loadErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
    if (ERROR_MESSAGES[err.code]) return ERROR_MESSAGES[err.code]
    return err.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function PostingDetail({ posting, onClose, onBooked, onExpired }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  if (!posting) return null

  const eq = EQUIPMENT_TYPES[posting.equipmentType]

  const needsAdvisory =
    posting.deadheadMi != null && posting.deadheadMi > 250 ||
    posting.nearestDriver == null

  async function handleBook() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await bookPosting(posting.id)
      setResult(res)
      onBooked?.(res)
    } catch (err) {
      if (err?.name === 'AbortError') return
      const code = err instanceof ApiError ? err.code : null
      if (code === 'POSTING_TAKEN' || code === 'POSTING_EXPIRED') {
        onExpired?.(code)
      }
      setError(loadErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="lb-detail-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        className="lb-detail-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-detail-header">
          <div className="lb-detail-header-title">
            <span className="mono">#{posting.id}</span>
            <span className="lb-detail-broker">{posting.broker}</span>
          </div>
          <button type="button" className="lb-detail-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="lb-detail-body">
          <div className="lb-detail-route">
            <div className="lb-detail-route-cities">
              {formatPlace(posting.originCity, posting.originState)}
              <span className="lb-detail-arrow">→</span>
              {formatPlace(posting.destinationCity, posting.destinationState)}
            </div>
            <div className="lb-detail-route-sub">
              {formatDistance(posting.distanceMi)} · {formatWeight(posting.weightLbs)}
            </div>
          </div>

          <div className="lb-detail-grid">
            <div className="lb-detail-field">
              <div className="lb-detail-label">Rate</div>
              <div className="lb-detail-value mono">{formatMoney(posting.rateUsd)}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">$/mi</div>
              <div className="lb-detail-value mono">{formatRatePerMile(posting.rateUsd, posting.distanceMi)}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Deadhead</div>
              <div className="lb-detail-value mono">{formatDeadhead(posting.deadheadMi)}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Equipment</div>
              <div className="lb-detail-value">
                {eq ? eq.label : posting.equipmentType}
                {posting.equipmentLengthFt ? `, ${posting.equipmentLengthFt}ft` : ''}
              </div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Pickup</div>
              <div className="lb-detail-value mono">{formatDateTime(posting.pickupAt)}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Delivery</div>
              <div className="lb-detail-value mono">{formatDateTime(posting.deliveryAt)}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Commodity</div>
              <div className="lb-detail-value">{posting.commodity || '—'}</div>
            </div>
            <div className="lb-detail-field">
              <div className="lb-detail-label">Posted</div>
              <div className="lb-detail-value mono">{formatDateTime(posting.postedAt)}</div>
            </div>
          </div>

          {posting.nearestDriver && (
            <div className="lb-detail-driver">
              <div className="lb-detail-label">Nearest driver</div>
              <div className="lb-detail-driver-info">
                <span className="lb-detail-driver-name">{posting.nearestDriver.name}</span>
                <span className="lb-detail-driver-detail">
                  {formatDeadhead(posting.deadheadMi)} away · HOS {formatHos(posting.nearestDriver.hosRemainingMin)}
                </span>
              </div>
            </div>
          )}

          {needsAdvisory && (
            <div className="lb-advisory">
              <Warning size={15} weight="fill" />
              <span>
                {posting.nearestDriver == null
                  ? 'No available driver near this origin.'
                  : 'Long deadhead — driver may not reach pickup in time.'}
              </span>
            </div>
          )}

          {error && (
            <div className="lb-detail-error">
              <Warning size={15} weight="fill" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="lb-detail-success">
              <CheckCircle size={15} weight="fill" />
              <div>
                <div>Load <span className="mono">{result.load?.id}</span> created.</div>
                <Link
                  to={`/loads/${result.load?.id}`}
                  className="lb-detail-link"
                  onClick={onClose}
                >
                  View load →
                </Link>
                {result.warnings?.length > 0 && (
                  <ul className="lb-detail-warnings">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{WARNING_TEXT[w] || w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lb-detail-footer">
          <button
            type="button"
            className="lb-book-btn"
            onClick={handleBook}
            disabled={busy || result}
          >
            {busy ? 'Booking…' : result ? 'Booked' : 'Book load'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
