import { motion } from 'framer-motion'
import './AlertStrip.css'

export default function AlertStrip({ items }) {
  if (!items || items.length === 0) return null

  return (
    <motion.div
      className="alert-strip"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">·</span>}{' '}
          <b>{item.strong}</b> {item.text}
        </span>
      ))}
    </motion.div>
  )
}
