import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Star, Phone, Coffee } from '@phosphor-icons/react'
import { formatCdl, formatRating, formatHos } from '../../utils/format'

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

      <div className="driver-card-hours">
        <div>
          <div className="driver-card-hours-val mono">{formatHos(driver.hoursTodayMin)}</div>
          <div className="driver-card-hours-lbl">Today</div>
        </div>
        <div>
          <div className="driver-card-hours-val mono">{formatHos(driver.hoursWeekMin)}</div>
          <div className="driver-card-hours-lbl">This week</div>
        </div>
      </div>

      <div className="driver-card-actions">
        <button className="driver-card-btn" aria-label={'Call ' + driver.name}>
          <Phone size={13} aria-hidden="true" /> Call
        </button>
        <button className="driver-card-btn" aria-label={'Send ' + driver.name + ' a break request'}>
          <Coffee size={13} aria-hidden="true" /> Break
        </button>
      </div>
    </motion.div>
  )
}
