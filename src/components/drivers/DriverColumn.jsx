import { motion } from 'framer-motion'
import DriverCard from './DriverCard'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const card = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export default function DriverColumn({ label, dot, drivers }) {
  return (
    <div className="driver-column">
      <div className="driver-column-head">
        <span className={'driver-column-dot ' + dot}></span>
        {label}
        <span className="driver-column-count">{drivers.length}</span>
      </div>
      <motion.div className="driver-column-body" variants={container} initial="hidden" animate="show">
        {drivers.map((driver) => (
          <DriverCard key={driver.id} driver={driver} variants={card} />
        ))}
        {drivers.length === 0 && <div className="driver-column-empty">No drivers here</div>}
      </motion.div>
    </div>
  )
}
