import { useNavigate } from 'react-router-dom'
import { formatMoney, formatPlace } from '../../utils/format'
import '../dashboard/Panel.css'
import '../dashboard/Charts.css'
import '../dashboard/LoadBoard.css'

// Margin is stated, not graded. It used to be badged in the same green /
// amber / red the app uses for load status, so a load the dispatcher
// deliberately ran at 4% -- to reposition a truck, to keep a driver
// working -- was stamped in the colour that elsewhere means "Delayed".
// The percentage is the fact; whether it was the right call depends on
// what else was on the board that day.

export default function LoadProfitTable({ loads }) {
  const navigate = useNavigate()

  return (
    <div className="panel load-board">
      <div className="panel-head">
        <div className="panel-title">
          Load profitability
          <div className="panel-subtitle">Revenue less driver pay, fuel and fixed cost</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Load</th>
            <th>Route</th>
            <th>Broker</th>
            <th>Rate</th>
            <th>Cost</th>
            <th>Margin</th>
            <th>RPM</th>
          </tr>
        </thead>
        <tbody>
          {loads.length === 0 && (
            <tr><td colSpan={7} className="page-empty">No loads to price out yet.</td></tr>
          )}
          {loads.map((load) => {
            const cost = Math.round(load.driverPayUsd + load.fuelCostUsd + load.otherCostUsd)
            return (
              <tr
                className="row"
                key={load.loadId}
                onClick={() => navigate('/loads/' + load.loadId)}
              >
                <td className="load-id mono">#{load.loadId}</td>
                <td><div className="route">{formatPlace(load.originCity, load.originState)} <span className="arrow">→</span> {formatPlace(load.destinationCity, load.destinationState)}</div></td>
                <td>{load.broker}</td>
                <td className="rate mono">{formatMoney(load.rateUsd)}</td>
                <td className="mono">{formatMoney(cost)}</td>
                <td>
                  <span className="mono">
                    <span className="dot"></span>
                    {load.marginPct}%
                  </span>
                </td>
                <td className="mono">${load.rpm.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
