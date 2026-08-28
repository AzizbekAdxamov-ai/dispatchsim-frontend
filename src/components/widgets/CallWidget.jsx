import { motion } from 'framer-motion'
import './CallWidget.css'

export default function CallWidget({ call, onAccept, onDecline }) {
  if (!call) return null

  return (
    <motion.div
      className="call-widget"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="call-top">
        <motion.div
          className="call-ring"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {call.initials}
        </motion.div>
        <div className="call-info">
          <div className="call-label">Incoming call</div>
          <div className="call-name">{call.name}</div>
          <div className="call-sub">{call.sub}</div>
        </div>
      </div>
      <div className="call-actions">
        <button className="call-btn decline" onClick={onDecline}>Decline</button>
        <button className="call-btn accept" onClick={onAccept}>Accept</button>
      </div>
    </motion.div>
  )
}
