import { FileText } from '@phosphor-icons/react'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './Documents.css'

export default function Documents() {
  return (
    <div className="documents-page">
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Load paperwork and compliance files in one place</div>
        </div>
      </div>

      <div className="page-tabs">
        <button className="page-tab active">All <span className="page-tab-count">0</span></button>
      </div>

      <div className="panel">
        <div className="page-empty">
          <FileText size={32} weight="thin" style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 12 }}>No documents yet.</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Documents will appear once loads are booked and paperwork is uploaded.
          </div>
        </div>
      </div>
    </div>
  )
}
