import { Bell } from '@phosphor-icons/react'
import '../components/dashboard/Panel.css'
import '../components/dashboard/AlertQueue.css'
import './PageHeader.css'
import './Alerts.css'

export default function Alerts() {
  return (
    <div className="alerts-page">
      <div className="page-head">
        <div>
          <div className="page-title">Alerts</div>
          <div className="page-sub">Active issues that need dispatcher attention</div>
        </div>
      </div>

      <div className="page-tabs">
        <button className="page-tab active">All <span className="page-tab-count">0</span></button>
      </div>

      <div className="panel">
        <div className="alert-queue-list">
          <div className="alert-queue-empty">
            <Bell size={32} weight="thin" style={{ opacity: 0.3 }} />
            <div style={{ marginTop: 12 }}>No active alerts.</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
              Alerts will appear when loads are delayed, HOS limits approach, or documents are missing.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
