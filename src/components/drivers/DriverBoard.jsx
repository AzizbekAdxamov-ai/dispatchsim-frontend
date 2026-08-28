import { useNavigate } from 'react-router-dom'
import DriverColumn from './DriverColumn'
import '../dashboard/Panel.css'
import './DriverBoard.css'

const COLUMNS = [
  { key: 'driving', label: 'Driving', dot: 'on' },
  { key: 'resting', label: 'Resting', dot: 'hos' },
  { key: 'off', label: 'Off duty', dot: 'off' },
]

export default function DriverBoard({ drivers }) {
  const navigate = useNavigate()

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Driver management <span className="panel-count">{drivers.length}</span>
        </div>
        <button className="panel-action" onClick={() => navigate('/drivers')}>View all</button>
      </div>
      <div className="driver-board-columns">
        {COLUMNS.map((col) => (
          <DriverColumn
            key={col.key}
            label={col.label}
            dot={col.dot}
            drivers={drivers.filter((d) => d.dutyStatus === col.key)}
          />
        ))}
      </div>
    </div>
  )
}
