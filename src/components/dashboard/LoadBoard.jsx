import { motion } from 'framer-motion'
import { STATUS_LABEL } from '../../data/mockData'
import { formatMoney, formatPlace } from '../../utils/format'
import './Panel.css'
import './LoadBoard.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const row = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

export default function LoadBoard({ loads }) {
  return (
    <div className="panel load-board">
      <div className="panel-head">
        <div className="panel-title">
          Active loads <span className="panel-count">{loads.length}</span>
        </div>
        <button className="panel-action">View all</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Load</th>
            <th>Route</th>
            <th>Broker</th>
            <th>Rate</th>
            <th>Status</th>
          </tr>
        </thead>
        <motion.tbody variants={container} initial="hidden" animate="show">
          {loads.map((load) => (
            <motion.tr className="row" key={load.id} variants={row}>
              <td className="load-id mono">#{load.id}</td>
              <td>
                <div className="route">
                  {formatPlace(load.originCity, load.originState)} <span className="arrow">→</span> {formatPlace(load.destinationCity, load.destinationState)}
                </div>
              </td>
              <td>{load.broker}</td>
              <td className="rate mono">{formatMoney(load.rateUsd)}</td>
              <td>
                <span className={'badge ' + load.status}>
                  <span className="dot"></span>
                  {STATUS_LABEL[load.status]}
                </span>
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  )
}
