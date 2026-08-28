import { motion } from 'framer-motion'
import './Panel.css'
import './ActivityFeed.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export default function ActivityFeed({ items }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Recent activity</div>
        <button className="panel-action">See all</button>
      </div>
      <motion.div className="activity-feed-list" variants={container} initial="hidden" animate="show">
        {items.map((row) => (
          <motion.div className="activity-feed-item" key={row.id} variants={item}>
            <span className="activity-feed-dot" />
            <span className="activity-feed-text">{row.text}</span>
            <span className="activity-feed-time">{row.time}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
