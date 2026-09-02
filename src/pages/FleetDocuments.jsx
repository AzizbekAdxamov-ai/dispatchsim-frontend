import { FileText } from '@phosphor-icons/react'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Documents.css'

export default function FleetDocuments() {
  return (
    <div className="documents-page">
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Vehicle and company paperwork in one place</div>
        </div>
      </div>

      <div className="page-tabs">
        <button className="page-tab active">All <span className="page-tab-count">0</span></button>
      </div>

      <div className="panel">
        <div className="page-empty">
          <FileText size={32} weight="thin" style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 12 }}>No fleet documents yet.</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Vehicle registrations, inspection certificates and insurance documents will appear here.
          </div>
        </div>
      </div>
    </div>
  )
}
