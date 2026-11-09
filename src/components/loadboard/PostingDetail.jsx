import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ChatCircleText } from '@phosphor-icons/react'
import { listChecks } from '../../api/brokerCheck'
import { useResource } from '../../hooks/useResource'
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
import { rateQuote, RATE_LABELS } from '../../utils/rateQuote'
import { nearestDriverNote, NEAREST_DRIVER_COPY } from './nearestDriverNote'
import './PostingDetail.css'

function formatCheckedAt(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function PostingDetail({ posting, onClose, rateLabels = RATE_LABELS, driverCopy = NEAREST_DRIVER_COPY }) {
  // The dispatcher's own lookup journal. Matched by MC number rather than
  // fetched per posting, because it is small (100 rows) and this way the
  // panel needs no new endpoint. A broker they have never run shows
  // nothing at all — not a warning, not a nudge, just the link.
  const fetchChecks = useCallback(async (signal) => await listChecks(signal), [])
  const { data: checkData } = useResource(fetchChecks, [])

  if (!posting) return null

  const quote = rateQuote(posting)
  const eq = EQUIPMENT_TYPES[posting.equipmentType]

  const myCheck = posting.brokerMcNumber
    ? (checkData?.checks ?? []).find(
        (c) => c.mcNumber === posting.brokerMcNumber && c.brokerId != null,
      )
    : null

  // Only the fact survives. The long-deadhead branch used to add "driver
  // may not reach pickup in time" above 250 miles — a guess dressed as a
  // warning, on a panel that withholds the broker's credit rating for
  // exactly the opposite reason.
  const needsAdvisory = posting.nearestDriver == null

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
              <div className="lb-detail-label">{quote.split ? rateLabels.totalRate : rateLabels.rate}</div>
              {/* Stated, not hinted at. "Call for rate" is a fact about
                  the posting, not a missing value — the broker knows the
                  number and expects to be asked for it. */}
              <div className="lb-detail-value mono">
                {posting.rateHidden ? <span className="lb-ask">Call for rate</span> : formatMoney(quote.totalUsd)}
              </div>
            </div>
            {quote.split && <>
              <div className="lb-detail-field"><div className="lb-detail-label">{rateLabels.linehaul}</div><div className="lb-detail-value mono">{formatMoney(quote.linehaulUsd)}</div></div>
              <div className="lb-detail-field"><div className="lb-detail-label">{rateLabels.fuel}</div><div className="lb-detail-value mono">{formatMoney(quote.fuelSurchargeUsd)}</div></div>
            </>}
            <div className="lb-detail-field">
              <div className="lb-detail-label">$/mi</div>
              <div className="lb-detail-value mono">
                {posting.rateHidden ? <span className="lb-ask">—</span> : formatRatePerMile(quote.totalUsd, posting.distanceMi)}
              </div>
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
              <span>{nearestDriverNote(posting, null, driverCopy, EQUIPMENT_TYPES[posting.equipmentType]?.label ?? posting.equipmentType)}</span>
            </div>
          )}

        </div>

        {posting.brokerMcNumber && (
          <div className="lb-broker-card">
            <div className="lb-broker-card-head">Broker</div>
            {/* Company, contact, MC number. No credit rating and no payment
                days: printing them here would be the program passing a
                verdict, and it would remove any reason to ever run the
                number. The rating still decides the load's payment terms
                at booking — it just is not handed over unasked. */}
            <dl className="lb-broker-facts">
              <div><dt>Company</dt><dd>{posting.broker}</dd></div>
              <div><dt>Contact</dt><dd>{posting.brokerContactName}</dd></div>
              <div><dt>MC number</dt><dd className="mono">{posting.brokerMcNumber}</dd></div>
            </dl>

            {myCheck ? (
              <div className="lb-broker-check">
                You ran this MC on {formatCheckedAt(myCheck.checkedAt)}:{' '}
                <span className="mono">{myCheck.creditRating}</span>, pays in{' '}
                <span className="mono">{myCheck.daysToPay}</span> days.
              </div>
            ) : (
              <Link to="/broker-check" className="lb-broker-check-link" onClick={onClose}>
                Run this MC number →
              </Link>
            )}
          </div>
        )}

        {/* No booking button. A load starts with a conversation: you talk
            to the broker, settle a rate, they send the rate confirmation,
            you read it and sign it. That last step is what creates the
            load — see acceptRateCon in api/brokerChat.js. */}
        <div className="lb-detail-footer">
          <Link
            to={`/broker-chat?posting=${encodeURIComponent(posting.id)}`}
            className="lb-book-btn"
            onClick={onClose}
          >
            <ChatCircleText size={15} weight="fill" />
            Contact broker
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
