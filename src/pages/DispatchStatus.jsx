import { TrendUp } from '@phosphor-icons/react'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './DispatchStatus.css'

export default function DispatchStatus() {
  return (
    <>
      <div className="page-head-plain">
        <div className="page-title">Dispatch status</div>
        <div className="page-sub">How brokers and partners rate your dispatch performance</div>
      </div>

      <div className="panel">
        <div className="page-empty">
          <TrendUp size={32} weight="thin" style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 12 }}>No dispatch ratings yet.</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Ratings will appear once loads are delivered and brokers submit feedback.
          </div>
        </div>
      </div>
    </>
  )
}
