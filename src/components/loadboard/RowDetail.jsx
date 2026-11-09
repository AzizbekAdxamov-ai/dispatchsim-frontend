import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChatCircleText, MapTrifold } from '@phosphor-icons/react'
import { listChecks } from '../../api/brokerCheck'
import { useResource } from '../../hooks/useResource'
import { EQUIPMENT_TYPES } from '../../data/equipmentTypes'
import {
  formatMoney,
  formatDateTime,
  formatRatePerMile,
  formatDeadhead,
  formatDistance,
  formatWeight,
  formatHos,
} from '../../utils/format'
import { rateQuote, RATE_LABELS } from '../../utils/rateQuote'
import { marketLines } from './marketLines'
import { nearestDriverNote, NEAREST_DRIVER_COPY } from './nearestDriverNote'
import './RowDetail.css'

// The row, opened.
//
// Three columns, because a posting answers three different questions and a
// dispatcher reads them in this order: what the trip is, what it pays, and
// who is asking. Inline under the row rather than in a drawer over the
// board -- the next row down is part of the decision, and a panel that
// covers it takes the comparison away.

function checkedOn(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function RowDetail({ posting, deadheadFrom, deadheadTo, rateLabels = RATE_LABELS, driverCopy = NEAREST_DRIVER_COPY }) {
  const driverNote = nearestDriverNote(posting, deadheadFrom, driverCopy, EQUIPMENT_TYPES[posting.equipmentType]?.label ?? posting.equipmentType)
  // The dispatcher's own lookup journal. Matched by MC number rather than
  // fetched per posting, because it is small and this way the panel needs
  // no new endpoint. A broker they have never run shows nothing at all --
  // not a warning, not a nudge, just the link.
  const fetchChecks = useCallback(async (signal) => await listChecks(signal), [])
  const { data: checkData } = useResource(fetchChecks, [])

  const quote = rateQuote(posting)
  const eq = EQUIPMENT_TYPES[posting.equipmentType]
  const market = marketLines(posting.market)
  const myCheck = posting.brokerMcNumber
    ? (checkData?.checks ?? []).find((c) => c.mcNumber === posting.brokerMcNumber && c.brokerId != null)
    : null

  return (
    <div className="rd">
      <section className="rd-col">
        <h3 className="rd-h">Trip</h3>

        <div className="rd-leg">
          <span className="rd-dot" aria-hidden="true" />
          <div>
            <div className="rd-place">{posting.originCity}, {posting.originState}</div>
            <div className="rd-sub mono">{formatDateTime(posting.pickupAt)}</div>
          </div>
        </div>
        <div className="rd-leg">
          <span className="rd-dot rd-dot-end" aria-hidden="true" />
          <div>
            <div className="rd-place">{posting.destinationCity}, {posting.destinationState}</div>
            <div className="rd-sub mono">{formatDateTime(posting.deliveryAt)}</div>
          </div>
        </div>

        <dl className="rd-facts">
          <div><dt>Load</dt><dd>Full</dd></div>
          <div><dt>Truck</dt><dd>{eq?.label ?? posting.equipmentType}</dd></div>
          <div><dt>Length</dt><dd className="mono">{posting.equipmentLengthFt} ft</dd></div>
          <div><dt>Weight</dt><dd className="mono">{formatWeight(posting.weightLbs)}</dd></div>
          <div><dt>Commodity</dt><dd>{posting.commodity || '—'}</dd></div>
          <div><dt>Reference</dt><dd className="mono">{posting.id.slice(0, 8)}</dd></div>
        </dl>

        <div className="rd-contact">
          <div className="rd-label">Contact</div>
          {/* A phone number would be a prop. The way to reach this broker
              is the thread, and that is also where the rate is agreed and
              the rate confirmation arrives. */}
          <div>{posting.brokerContactName ?? '—'} · <Link to={`/broker-chat?posting=${encodeURIComponent(posting.id)}`}>open the thread</Link></div>
        </div>
      </section>

      <section className="rd-col">
        <h3 className="rd-h">Rate</h3>

        <dl className="rd-facts rd-facts-wide">
          <div>
            <dt>{rateLabels.total}</dt>
            <dd className="rd-total mono">
              {posting.rateHidden ? <span className="rd-ask">Call for rate</span> : formatMoney(quote.totalUsd)}
            </dd>
          </div>
          {quote.split && <>
            <div><dt>{rateLabels.linehaul}</dt><dd className="mono">{formatMoney(quote.linehaulUsd)}</dd></div>
            <div><dt>{rateLabels.fuel}</dt><dd className="mono">{formatMoney(quote.fuelSurchargeUsd)}</dd></div>
          </>}
          <div><dt>Trip</dt><dd className="mono">{formatDistance(posting.distanceMi)}</dd></div>
          <div>
            <dt>Rate per mile</dt>
            <dd className="mono">
              {posting.rateHidden ? <span className="rd-ask">—</span> : formatRatePerMile(quote.totalUsd, posting.distanceMi)}
            </dd>
          </div>
          <div>
            <dt>DH-O</dt>
            <dd className="mono">
              {formatDeadhead(posting.deadheadMi)}
              {deadheadFrom?.kind === 'location' && <span className="rd-sub"> from {deadheadFrom.city}, {deadheadFrom.state}</span>}
              {deadheadFrom?.kind === 'driver' && posting.nearestDriverName && <span className="rd-sub"> — {posting.nearestDriverName}</span>}
            </dd>
          </div>
          {deadheadTo && (
            <div>
              <dt>DH-D</dt>
              <dd className="mono">
                {formatDeadhead(posting.deadheadDestMi)}
                <span className="rd-sub"> to {deadheadTo.city}, {deadheadTo.state}</span>
              </dd>
            </div>
          )}
          <div><dt>Posted</dt><dd className="mono">{formatDateTime(posting.postedAt)}</dd></div>
          <div><dt>Expires</dt><dd className="mono">{formatDateTime(posting.expiresAt)}</dd></div>
        </dl>

        {market && (
          <div className="rd-market">
            <div className="rd-label">{market.heading}</div>
            <dl className="rd-facts">
              {market.lines.map((line) => (
                <div key={line.label}>
                  <dt>{line.label}</dt>
                  <dd className="mono">
                    {line.value}
                    {line.note && <span className="rd-sub"> · {line.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="rd-sub rd-market-note">{market.footnote}</div>
          </div>
        )}

        <Link
          className="rd-route-btn"
          to={`/routes?originCity=${encodeURIComponent(posting.originCity)}&originState=${posting.originState}&destinationCity=${encodeURIComponent(posting.destinationCity)}&destinationState=${posting.destinationState}`}
        >
          <MapTrifold size={15} aria-hidden="true" />
          View route
        </Link>
      </section>

      <section className="rd-col">
        <h3 className="rd-h">Company</h3>

        {/* Company, contact, MC number. No credit rating and no payment
            days: printing them here would be the program passing a
            verdict, and it would remove any reason to ever run the
            number. The rating still decides the load's payment terms at
            booking -- it just is not handed over unasked. */}
        <div className="rd-company">{posting.broker}</div>
        <dl className="rd-facts">
          <div><dt>Contact</dt><dd>{posting.brokerContactName ?? '—'}</dd></div>
          <div><dt>MC number</dt><dd className="mono">{posting.brokerMcNumber ?? '—'}</dd></div>
        </dl>

        {posting.brokerMcNumber && (
          myCheck ? (
            <div className="rd-check">
              You ran this MC on {checkedOn(myCheck.checkedAt)}: <span className="mono">{myCheck.creditRating}</span>,
              {' '}pays in <span className="mono">{myCheck.daysToPay}</span> days.
            </div>
          ) : (
            <Link to="/broker-check" className="rd-check-link">Run this MC number →</Link>
          )
        )}

        {posting.nearestDriverName && (
          <div className="rd-driver">
            <div className="rd-label">Nearest driver</div>
            <div>
              {posting.nearestDriverName}
              <span className="rd-sub"> · {formatDeadhead(posting.deadheadMi)} away · HOS {formatHos(posting.nearestDriverHosRemainingMin)}</span>
            </div>
          </div>
        )}

        {driverNote && (
          <div className="rd-driver">
            <div className="rd-label">Nearest driver</div>
            <div className="rd-sub">{driverNote}</div>
          </div>
        )}

        {/* No booking button. A load starts with a conversation: you talk
            to the broker, settle a rate, they send the rate confirmation,
            you read it and sign it. That last step is what creates the
            load -- see acceptRateCon in api/brokerChat.js. */}
        <Link to={`/broker-chat?posting=${encodeURIComponent(posting.id)}`} className="rd-contact-btn">
          <ChatCircleText size={15} weight="fill" aria-hidden="true" />
          Contact broker
        </Link>
      </section>
    </div>
  )
}
