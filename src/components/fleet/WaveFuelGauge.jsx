import './FleetWidgets.css'
import './WaveFuelGauge.css'

const TANK_HEIGHT = 120

export default function WaveFuelGauge({ pct, gallons, capacity, lastFueledDate, lastFueledLocation }) {
  const level = TANK_HEIGHT - (pct / 100) * TANK_HEIGHT

  return (
    <div className="widget fuel-widget">
      <div className="widget-title">Fuel level</div>
      <div className="widget-sub">Live</div>
      <div className="fuel-tank" role="img" aria-label={'Fuel level ' + pct + '%, ' + gallons + ' gallons'}>
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="wave1">
          <path
            d={`M0,${level} C50,${level - 8} 100,${level + 8} 150,${level} C200,${level - 8} 250,${level + 8} 300,${level} C350,${level - 8} 400,${level + 8} 400,${level} L400,${TANK_HEIGHT} L0,${TANK_HEIGHT} Z`}
            fill="var(--blue)"
          />
        </svg>
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="wave2">
          <path
            d={`M0,${level} C60,${level + 8} 120,${level - 8} 180,${level} C240,${level + 8} 300,${level - 8} 360,${level} C400,${level + 6} 400,${level} 400,${level} L400,${TANK_HEIGHT} L0,${TANK_HEIGHT} Z`}
            fill="var(--accent)"
          />
        </svg>
        <div className="fuel-label">
          <div className="fuel-pct">{pct}%</div>
          <div className="fuel-sub">{gallons} / {capacity} gal</div>
        </div>
      </div>
      <div className="fuel-caption">
        Last fill-up: <b>{lastFueledDate}</b> — {lastFueledLocation}
      </div>
    </div>
  )
}
