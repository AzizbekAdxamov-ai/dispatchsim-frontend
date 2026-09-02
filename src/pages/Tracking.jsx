import { MapPin } from '@phosphor-icons/react'
import '../components/dashboard/Panel.css'
import './Tracking.css'

export default function Tracking() {
  return (
    <div className="tracking-page">
      <div className="page-head-plain">
        <div className="page-title">Tracking</div>
        <div className="page-sub">Live shipment tracking and route history</div>
      </div>

      <div className="panel">
        <div className="page-empty">
          <MapPin size={32} weight="thin" style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 12 }}>No active shipments to track.</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Book a load from the board to start tracking.
          </div>
        </div>
      </div>
    </div>
  )
}
