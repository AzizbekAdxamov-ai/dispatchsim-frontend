import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Star, BookOpenText } from '@phosphor-icons/react'
import { formatCdl, formatRating } from '../../utils/format'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function DriverCard({ driver, variants }) {
  return (
    <motion.div className="driver-card" variants={variants}>
      <div className="driver-card-top">
        <div className="driver-card-avatar" aria-hidden="true">{initials(driver.name)}</div>
        <div className="driver-card-id">
          <Link to={'/drivers/' + driver.id} className="driver-card-name driver-card-stretched-link">
            {driver.name}
          </Link>
          <div className="driver-card-cdl mono">{formatCdl(driver.cdlClass, driver.cdlNumber)}</div>
        </div>
        <div className="driver-card-rating">
          <Star size={12} weight="fill" aria-hidden="true" /> {formatRating(driver.brokerRatingX10)}
        </div>
      </div>

      <div className="driver-card-email">{driver.email}</div>

      <div className="driver-card-actions">
        {/* The one HOS action that exists: the driver's own ELD log. Call
            and Break are the two dead controls the 2026-09-08 audit left
            alone because their moment never came -- a button that looks
            live and does nothing teaches the wrong lesson, so they yield
            their row to a link that goes somewhere real. */}
        <Link to={`/compliance/hos/${driver.id}`} className="driver-card-btn driver-card-log-link">
          <BookOpenText size={13} aria-hidden="true" /> View Event Log
        </Link>
      </div>
    </motion.div>
  )
}
