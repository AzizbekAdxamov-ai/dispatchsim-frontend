import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Storefront, Warning } from '@phosphor-icons/react'
import { listTruckListings, buyTruckListing } from '../api/truckListings'
import { truckThumb } from '../data/truckImages'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { formatMoney, formatMiles } from '../utils/format'
import './HrApplicants.css'
import './TruckMarket.css'

// Buying used to fail in silence: the catch below did nothing but
// console.error, so a rejected purchase looked exactly like a button that
// had stopped spinning. It hid a real bug for days -- the controller was
// reading req.user.sub, which does not exist in this app (requireAuth sets
// req.auth.userId), so every purchase threw a TypeError and the screen
// said nothing at all.
//
// Matched on ApiError.code, never on message text. INSUFFICIENT_FUNDS
// keeps the server's own wording because it names the actual numbers.
const ERRORS = {
  LISTING_NOT_FOUND: 'That listing is no longer on the market.',
  LISTING_ALREADY_BOUGHT: 'Someone got to that one first.',
  LISTING_EXPIRED: 'That listing has expired.',
  FORBIDDEN: 'Buying trucks is fleet-manager work — switch workspace first.',
  NETWORK_ERROR: 'Cannot reach the server.',
}

function buyErrorText(err) {
  const code = err instanceof ApiError ? err.code : null
  if (code === 'INSUFFICIENT_FUNDS') return err.message
  return ERRORS[code] || err?.message || 'Something went wrong. Please try again.'
}

const TRAILER_LABEL = {
  'dry-van': 'Dry Van',
  'reefer': 'Reefer',
  'flatbed': 'Flatbed',
  'step-deck': 'Step Deck',
  'tanker': 'Tanker',
  'power-only': 'Power Only',
}

export default function TruckMarket() {
  const navigate = useNavigate()
  const [buyingId, setBuyingId] = useState(null)
  const [buyError, setBuyError] = useState('')

  const fetchListings = useCallback(
    async (signal) => {
      const data = await listTruckListings(signal)
      return data
    },
    [],
  )

  const { data, error, loading, refetch } = useResource(fetchListings, [], { pollMs: 15000 })

  const listings = data?.listings ?? []

  async function handleBuy(listingId) {
    if (buyingId) return
    setBuyError('')
    setBuyingId(listingId)
    try {
      await buyTruckListing(listingId)
      refetch()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setBuyError(buyErrorText(err))
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Truck market</div>
          <div className="page-sub">Used Class-8 tractors for sale</div>
        </div>
      </div>

      {buyError && (
        <div className="tm-error" role="alert">
          <Warning size={15} weight="fill" />
          <span>{buyError}</span>
        </div>
      )}

      <div className="page-toolbar">
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">{loading ? '…' : `${listings.length} listings`}</div>
      </div>

      <div className="panel load-board">
        <table>
          <thead>
            <tr>
              <th className="tm-photo-col"></th>
              <th>Make / Model</th>
              <th>Year</th>
              <th>Odometer</th>
              <th>Tires (F/R)</th>
              <th>Trailer</th>
              <th>Service notes</th>
              <th>Seller</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="page-empty">Loading truck listings…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={10} className="page-empty">Could not load listings — {error.message}</td>
              </tr>
            )}
            {!loading && !error && listings.length === 0 && (
              <tr>
                <td colSpan={10} className="page-empty">
                  <Storefront size={24} weight="light" />
                  <div>No trucks on the market right now — new listings appear daily.</div>
                </td>
              </tr>
            )}
            {!loading && !error && (
              <AnimatePresence initial={false}>
                {listings.map((listing) => (
                  <motion.tr
                    className="row"
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => navigate(`/fleet/market/${listing.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="tm-photo-col">
                      {/* The truck you are actually looking at buying. A
                          $55,000 decision made off a row of numbers is not
                          how anyone buys a tractor. */}
                      <img
                        className="tm-thumb"
                        src={truckThumb(listing.trailerType)}
                        alt=""
                        loading="lazy"
                      />
                    </td>
                    <td>
                      <div className="route">
                        <strong>{listing.make}</strong> {listing.model}
                      </div>
                    </td>
                    <td className="mono">{listing.year}</td>
                    <td className="mono">{formatMiles(listing.odometerMi)}</td>
                    <td className="mono">{listing.tireFrontPct}% / {listing.tireRearPct}%</td>
                    <td>{TRAILER_LABEL[listing.trailerType] || listing.trailerType}</td>
                    <td>{listing.serviceNotes}</td>
                    <td>{listing.seller}</td>
                    <td className="rate mono">{formatMoney(listing.priceUsd)}</td>
                    <td>
                      <button
                        className="hr-hire-btn"
                        disabled={buyingId === listing.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBuy(listing.id)
                        }}
                      >
                        {buyingId === listing.id ? 'Buying…' : 'Buy'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
