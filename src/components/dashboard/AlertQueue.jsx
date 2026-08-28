import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye } from '@phosphor-icons/react'
import './Panel.css'
import './AlertQueue.css'

const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning' }

export default function AlertQueue({ alerts, limit }) {
  const navigate = useNavigate()
  const [resolved, setResolved] = useState([])

  const visible = alerts.filter((a) => !resolved.includes(a.id))
  const shown = limit ? visible.slice(0, limit) : visible

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Alert priority queue <span className="panel-count">{visible.length}</span>
        </div>
        <button className="panel-action" onClick={() => navigate('/alerts')}>See all</button>
      </div>
      <div className="alert-queue-list">
        {shown.length === 0 && <div className="alert-queue-empty">No active alerts.</div>}
        <AnimatePresence initial={false}>
          {shown.map((alert) => (
            <motion.div
              className={'alert-queue-item ' + alert.severity}
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="alert-queue-body">
                <div className="alert-queue-title-row">
                  <span className="alert-queue-title">{alert.title}</span>
                  <span className={'alert-queue-severity ' + alert.severity}>
                    {SEVERITY_LABEL[alert.severity]}
                  </span>
                </div>
                <div className="alert-queue-desc">{alert.description}</div>
              </div>
              <div className="alert-queue-actions">
                <button
                  className="resolve"
                  aria-label="Resolve"
                  onClick={() => setResolved((r) => [...r, alert.id])}
                >
                  <Check size={14} weight="bold" aria-hidden="true" />
                </button>
                <button aria-label="View"><Eye size={14} aria-hidden="true" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
