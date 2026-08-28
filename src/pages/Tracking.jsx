import {
  CalendarBlank,
  Truck,
  MapPin,
  Package,
  Scales,
  Ruler,
  DotsThreeVertical,
  Envelope,
  Phone,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from '@phosphor-icons/react'
import truckFront from '../assets/truck-front.png'
import { trackedShipment, trackingHistory, STATUS_LABEL } from '../data/mockData'
import '../components/dashboard/Panel.css'
import '../components/dashboard/LoadBoard.css'
import './Tracking.css'

export default function Tracking() {
  const s = trackedShipment

  return (
    <>
      <div className="tracking-toolbar">
        <div className="tracking-range">
          <button className="tracking-range-btn">Week ▾</button>
          <button className="tracking-range-btn mono"><CalendarBlank size={14} aria-hidden="true" /> 15 – 21 Aug 2026</button>
        </div>
        <button className="tracking-new-btn">+ Assign new load</button>
      </div>

      <div className="tracking-grid">
        <div className="tracking-col-main">
          <div className="panel tracking-shipment-card">
            <div className="tracking-shipment-info">
              <div className="tracking-shipment-id">
                <div className="tracking-shipment-label">Load ID</div>
                <div className="tracking-shipment-value mono">#{s.loadId}</div>
              </div>
              <div className="tracking-stat-grid">
                <div className="tracking-stat">
                  <span className="tracking-stat-icon" aria-hidden="true"><Truck size={14} /></span>
                  <span className="tracking-stat-val">{s.unit}</span>
                </div>
                <div className="tracking-stat">
                  <span className="tracking-stat-icon" aria-hidden="true"><MapPin size={14} /></span>
                  <span className="tracking-stat-val mono">{s.distance}</span>
                </div>
                <div className="tracking-stat">
                  <span className="tracking-stat-icon" aria-hidden="true"><Package size={14} /></span>
                  <span className="tracking-stat-val">{s.commodity}</span>
                </div>
                <div className="tracking-stat">
                  <span className="tracking-stat-icon" aria-hidden="true"><Scales size={14} /></span>
                  <span className="tracking-stat-val mono">{s.weight}</span>
                </div>
                <div className="tracking-stat">
                  <span className="tracking-stat-icon" aria-hidden="true"><Ruler size={14} /></span>
                  <span className="tracking-stat-val mono">{s.dimensions}</span>
                </div>
              </div>
            </div>
            <img className="tracking-truck-img" src={truckFront} alt="Assigned truck" />
          </div>

          <div className="panel tracking-route-card">
            <div className="panel-head">
              <div className="panel-title">Route</div>
              <button className="panel-action" aria-label="More options"><DotsThreeVertical size={16} weight="bold" /></button>
            </div>
            <div className="tracking-route-meta">
              <div>
                <div className="tracking-route-meta-key">Load ID</div>
                <div className="tracking-route-meta-val mono">#{s.loadId}</div>
              </div>
              <div>
                <div className="tracking-route-meta-key">Customer</div>
                <div className="tracking-route-meta-val">{s.customer}</div>
              </div>
              <div>
                <div className="tracking-route-meta-key">Arrival</div>
                <div className="tracking-route-meta-val">{s.arrival}</div>
              </div>
              <span className="badge warn tracking-status-badge"><span className="dot"></span>{s.status}</span>
            </div>

            <div className="tracking-timeline">
              {s.waypoints.map((wp, i) => (
                <div className="tracking-timeline-row" key={i}>
                  <span className={'tracking-timeline-dot ' + wp.state} />
                  <div className="tracking-timeline-body">
                    <div className="tracking-timeline-label">{wp.label}</div>
                    <div className="tracking-timeline-place">{wp.place}</div>
                  </div>
                  <div className="tracking-timeline-time mono">{wp.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">History</div>
              <button className="panel-action">See all</button>
            </div>
            <div className="load-board">
              <table>
                <thead>
                  <tr>
                    <th>Load</th>
                    <th>Route</th>
                    <th>Customer</th>
                    <th>Arrival</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingHistory.map((row) => (
                    <tr className="row" key={row.id}>
                      <td className="load-id mono">#{row.id}</td>
                      <td>{row.route}</td>
                      <td>{row.customer}</td>
                      <td className="mono">{row.arrival}</td>
                      <td>
                        <span className={'badge ' + row.status}>
                          <span className="dot"></span>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="tracking-col-side">
          <div className="panel tracking-map-card">
            <div className="panel-head">
              <div className="panel-title">Route map</div>
              <button className="panel-action" aria-label="More options"><DotsThreeVertical size={16} weight="bold" /></button>
            </div>
            <div className="tracking-map">
              <svg viewBox="0 0 320 220" className="tracking-map-svg">
                <defs>
                  <pattern id="mapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-soft)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="320" height="220" fill="url(#mapGrid)" />
                <path
                  d="M 40 190 C 90 150, 60 90, 120 80 S 220 40, 280 30"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                />
                <circle cx="40" cy="190" r="6" fill="var(--green)" />
                <circle cx="280" cy="30" r="6" fill="var(--red)" />
              </svg>
              <div className="tracking-map-controls">
                <button aria-label="Zoom in"><MagnifyingGlassPlus size={14} /></button>
                <button aria-label="Zoom out"><MagnifyingGlassMinus size={14} /></button>
              </div>
            </div>
          </div>

          <div className="panel tracking-contact-card">
            <div className="tracking-contact-avatar">{s.driver.name.split(' ').map((n) => n[0]).join('')}</div>
            <div className="tracking-contact-body">
              <div className="tracking-contact-role">{s.driver.role}</div>
              <div className="tracking-contact-name">{s.driver.name}</div>
            </div>
            <div className="tracking-contact-actions">
              <button aria-label="Message"><Envelope size={15} /></button>
              <button aria-label="Call"><Phone size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
