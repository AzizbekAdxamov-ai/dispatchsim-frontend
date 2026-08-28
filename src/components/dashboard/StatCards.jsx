import { motion } from 'framer-motion'
import './StatCards.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const card = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function StatCards({ stats }) {
  return (
    <motion.div className="stat-row" variants={container} initial="hidden" animate="show">
      {stats.map((stat) => (
        <motion.div className="stat-card" key={stat.label} variants={card} whileHover={{ y: -2 }}>
          <div className="stat-label">{stat.label}</div>
          <div className={'stat-value' + (stat.tone ? ' ' + stat.tone : '') + (stat.mono ? ' mono' : '')}>
            {stat.value}
          </div>
          <div className="stat-delta">{stat.delta}</div>
        </motion.div>
      ))}
    </motion.div>
  )
}
