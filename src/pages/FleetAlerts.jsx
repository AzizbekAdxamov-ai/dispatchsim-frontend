import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ArrowCounterClockwise } from '@phosphor-icons/react'
import { fleetAlerts } from '../data/fleetData'
import '../components/dashboard/Panel.css'
import '../components/dashboard/AlertQueue.css'
import './PageHeader.css'
import './Alerts.css'

const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning' }

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'critical', label: 'Critical', match: (a) => a.severity === 'critical' },
  { key: 'warning', label: 'Warning', match: (a) => a.severity === 'warning' },
  { key: 'resolved', label: 'Resolved', match: () => true },
]

export default function FleetAlerts() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [resolved, setResolved] = useState([])

  const counts = useMemo(() => ({
    all: fleetAlerts.filter((a) => !resolved.includes(a.id)).length,
    critical: fleetAlerts.filter((a) => a.severity === 'critical' && !resolved.includes(a.id)).length,
    warning: fleetAlerts.filter((a) => a.severity === 'warning' && !resolved.includes(a.id)).length,
    resolved: resolved.length,
  }), [resolved])

  const visible = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    if (tab === 'resolved') {
      return fleetAlerts.filter((a) => resolved.includes(a.id))
    }
    return fleetAlerts.filter((a) => activeTab.match(a) && !resolved.includes(a.id))
  }, [tab, resolved])

  return (
    <div className="alerts-page">
      <div className="page-head">
        <div>
          <div className="page-title">Alerts</div>
          <div className="page-sub">Open items that need a fleet manager's attention</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="page-tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="alert-queue-list">
          {visible.length === 0 && (
            <div className="alert-queue-empty">
              {tab === 'resolved' ? 'No resolved alerts yet.' : 'No alerts in this category.'}
            </div>
          )}
          <AnimatePresence initial={false}>
            {visible.map((alert) => (
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
                    <span className="alerts-type-tag">{alert.type}</span>
                    <span className="alerts-time mono">{alert.time}</span>
                  </div>
                  <div className="alert-queue-desc">{alert.description}</div>
                </div>
                <div className="alert-queue-actions">
                  {alert.truckId && (
                    <button className="load-link" aria-label="Open truck" onClick={() => navigate('/fleet/trucks/' + alert.truckId)}>
                      {alert.truckId}
                    </button>
                  )}
                  {!resolved.includes(alert.id) && (
                    <button
                      className="resolve"
                      aria-label="Resolve alert"
                      onClick={() => setResolved((r) => [...r, alert.id])}
                    >
                      <Check size={14} weight="bold" aria-hidden="true" />
                    </button>
                  )}
                  {resolved.includes(alert.id) && (
                    <button
                      aria-label="Reopen alert"
                      onClick={() => setResolved((r) => r.filter((id) => id !== alert.id))}
                    >
                      <ArrowCounterClockwise size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
