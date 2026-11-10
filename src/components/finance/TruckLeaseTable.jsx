import { formatMoney } from '../../utils/format.js'
import { TRUCK_LEASE_COPY } from './truckLeaseCopy'
import '../dashboard/Panel.css'
import '../dashboard/Charts.css'
import '../dashboard/LoadBoard.css'

// Lease paid per truck (backend overview.truckLease). Rows are facts, not a
// grade: a truck that costs more is simply a longer or pricier lease.
export default function TruckLeaseTable({ rows, copy = TRUCK_LEASE_COPY }) {
  return (
    <div className="panel load-board">
      <div className="panel-head">
        <div className="panel-title">
          {copy.title}
          <div className="panel-subtitle">{copy.subtitle}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>{copy.truck}</th>
            <th>{copy.paid}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={2} className="page-empty">{copy.empty}</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.truckId}>
              <td className="mono">{row.truckId}</td>
              <td className="mono">{formatMoney(row.amountUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
