import { motion } from 'framer-motion'
import './Panel.css'
import './DriverPanel.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const row = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

// Expects drivers already enriched with getDriverStatus() (state/status/
// meta/hos/hosLabel) — see Dashboard.jsx.
export default function DriverPanel({ drivers }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Drivers <span className="panel-count">{drivers.length}</span>
        </div>
        <button className="panel-action">View all</button>
      </div>
      <motion.div variants={container} initial="hidden" animate="show">
        {drivers.map((driver) => (
          <motion.div className="driver-row" key={driver.id} variants={row}>
            <div className={'driver-dot ' + driver.state}></div>
            <div className="driver-info">
              <div className="driver-name">{driver.name}</div>
              <div className="driver-meta">{driver.meta}</div>
            </div>
            <div className="driver-hos">
              <div className={'driver-hos-val mono' + (driver.state === 'hos' ? ' amber' : '')}>
                {driver.hos}
              </div>
              <div className="driver-hos-lbl">{driver.hosLabel}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
