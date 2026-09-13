import { useState, useCallback } from 'react'
import { standingMessage } from '../utils/companyStanding'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Warning, CheckCircle, ArrowLeft } from '@phosphor-icons/react'
import { getTruckListing, buyTruckListing } from '../api/truckListings'
import { getCashOverview } from '../api/cash'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { truckGallery } from '../data/truckImages'
import { specRows } from '../data/truckSpecLabels'
import { formatMoney, formatMiles } from '../utils/format'
import './TruckListingDetail.css'

const TRAILER_LABEL = {
  'dry-van': 'Dry Van',
  reefer: 'Reefer',
  flatbed: 'Flatbed',
  'step-deck': 'Step Deck',
  tanker: 'Tanker',
  'power-only': 'Power Only',
}

const ERRORS = {
  LISTING_NOT_FOUND: 'That listing is no longer on the market.',
  LISTING_ALREADY_BOUGHT: 'Someone got to that one first.',
  LISTING_EXPIRED: 'That listing has expired.',
  FORBIDDEN: 'Buying trucks is fleet-manager work — switch workspace first.',
  NETWORK_ERROR: 'Cannot reach the server.',
}

function buyErrorText(err) {
  const code = err instanceof ApiError ? err.code : null
  // INSUFFICIENT_FUNDS keeps the server's wording: it names the numbers.
  // The lender declining is not the same as this purchase not
  // fitting. standingMessage names both sides of the company's
  // position; INSUFFICIENT_FUNDS names only this debit.
  const standing = standingMessage(err)
  if (standing) return standing
  if (code === 'INSUFFICIENT_FUNDS') return err.message
  return ERRORS[code] || err?.message || 'Something went wrong. Please try again.'
}

export default function TruckListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shot, setShot] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bought, setBought] = useState(null)

  const fetchListing = useCallback(async (signal) => await getTruckListing(id, signal), [id])
  const { data: listing, error: loadError, loading } = useResource(fetchListing, [id])

  // The balance sits next to the price on purpose. Deciding whether to
  // spend $55,000 without seeing what is in the account is the one thing
  // this page should never make someone do.
  const fetchCash = useCallback(async (signal) => await getCashOverview(signal), [])
  const { data: cash } = useResource(fetchCash, [])

  async function handleBuy() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const res = await buyTruckListing(id)
      setBought(res)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(buyErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-empty">Loading…</div>
  if (loadError) return <div className="page-empty">Could not load this listing.</div>
  if (!listing) return null

  const shots = truckGallery(listing.trailerType)
  const details = specRows(listing)
  const sold = listing.status !== 'open' || bought
  const afterBalance = cash ? cash.balance - listing.priceUsd : null

  return (
    <>
      <button type="button" className="tld-back" onClick={() => navigate('/fleet/market')}>
        <ArrowLeft size={14} /> Truck market
      </button>

      <div className="tld-head">
        <h1 className="tld-title">{listing.year} {listing.make} {listing.model}</h1>
        <div className="tld-sub">
          Set up for {TRAILER_LABEL[listing.trailerType] || listing.trailerType} ·
          {' '}{formatMiles(listing.odometerMi)} on the odometer
        </div>
      </div>

      <div className="tld-grid">
        <div className="tld-gallery">
          <div className="tld-stage">
            <img src={shots[shot]} alt={`${listing.make} ${listing.model}`} />
          </div>
          <div className="tld-thumbs">
            {shots.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`tld-thumb ${i === shot ? 'active' : ''}`}
                onClick={() => setShot(i)}
                aria-label={`View ${i + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="tld-side">
          <div className="tld-price-card">
            <div className="tld-price-label">Asking price</div>
            <div className="tld-price mono">{formatMoney(listing.priceUsd)}</div>
            {/* Stated, not judged. No "you can afford this" and no warning
                icon — the two numbers are next to each other and the
                decision belongs to the person reading them. */}
            {cash && (
              <div className="tld-after">
                Cash now <span className="mono">{formatMoney(cash.balance)}</span> · after this
                purchase <span className="mono">{formatMoney(afterBalance)}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="tld-error" role="alert">
              <Warning size={15} weight="fill" />
              <span>{error}</span>
            </div>
          )}

          {bought ? (
            <div className="tld-bought">
              <CheckCircle size={16} weight="fill" />
              <div>
                <div>Bought — plate <span className="mono">{bought.truck?.id}</span>.</div>
                <Link to={`/fleet/trucks/${bought.truck?.id}`} className="tld-link">
                  Assign a driver →
                </Link>
              </div>
            </div>
          ) : (
            <button type="button" className="tld-buy" disabled={busy || sold} onClick={handleBuy}>
              {busy ? 'Buying…' : sold ? 'Sold' : `Buy for ${formatMoney(listing.priceUsd)}`}
            </button>
          )}

          <dl className="tld-specs">
            <div><dt>Year</dt><dd className="mono">{listing.year}</dd></div>
            <div><dt>Odometer</dt><dd className="mono">{formatMiles(listing.odometerMi)}</dd></div>
            <div><dt>Trailer</dt><dd>{TRAILER_LABEL[listing.trailerType] || listing.trailerType}</dd></div>
            <div><dt>Fuel capacity</dt><dd className="mono">{listing.fuelCapacityGal} gal</dd></div>
            <div><dt>Front tires</dt><dd className="mono">{listing.tireFrontPct}%</dd></div>
            <div><dt>Rear tires</dt><dd className="mono">{listing.tireRearPct}%</dd></div>
            <div><dt>Seller</dt><dd>{listing.seller}</dd></div>
          </dl>

          {listing.serviceNotes && (
            <div className="tld-notes">
              <div className="tld-notes-head">Seller's notes</div>
              <p>{listing.serviceNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* The detailed sheet, full width under the gallery. Every field
          here can change the answer to "should I buy this one": a day cab
          cannot run a two-day lane, a 40,000 lb rear axle decides what it
          may legally haul, a manual gearbox narrows who can drive it, and
          a truck in Spokane is a trip away from freight out of Atlanta.
          Nothing decorative — no seat material, no cabinet count. */}
      {details.length > 0 && (
        <div className="tld-sheet">
          <div className="tld-sheet-head">Detailed specs</div>
          <div className="tld-sheet-grid">
            {details.map(([label, value]) => (
              <div className="tld-spec" key={label}>
                <div className="tld-spec-label">{label}</div>
                <div className="tld-spec-value mono">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
