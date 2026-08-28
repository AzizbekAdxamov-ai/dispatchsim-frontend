import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import truckSide from '../../../assets/truck-side.png'
import truckSlate from '../../../assets/truck-side-night.png'
import { useTheme } from '../../../theme/ThemeProvider'
import { CARGO_ITEMS } from './cargoData'
import '../Panel.css'
import './CargoLayout.css'

gsap.registerPlugin(useGSAP)

const TOTAL_WEIGHT_CAPACITY = 44000
const TOTAL_VOLUME_CAPACITY = 2400

const PRIORITY_LABEL = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

function parseLbs(str) {
  return Number(str.replace(/[^\d]/g, ''))
}

function parseFt3(str) {
  return Number(str.replace(/[^\d]/g, ''))
}

export default function CargoLayout() {
  const [selected, setSelected] = useState(CARGO_ITEMS[1])
  const gridRef = useRef(null)
  const { theme } = useTheme()
  const truckImg = theme === 'dark' ? truckSlate : truckSide

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.cargo-card', {
        opacity: 0,
        y: 14,
        scale: 0.92,
        duration: 0.45,
        stagger: 0.06,
        ease: 'power2.out',
      })
    })
  }, { scope: gridRef })

  const totalWeight = CARGO_ITEMS.reduce((sum, i) => sum + parseLbs(i.weight), 0)
  const totalVolume = CARGO_ITEMS.reduce((sum, i) => sum + parseFt3(i.volume), 0)
  const weightPct = Math.round((totalWeight / TOTAL_WEIGHT_CAPACITY) * 100)
  const volumePct = Math.round((totalVolume / TOTAL_VOLUME_CAPACITY) * 100)

  const selectedIndex = CARGO_ITEMS.findIndex((i) => i.id === selected.id)
  function step(direction) {
    const next = (selectedIndex + direction + CARGO_ITEMS.length) % CARGO_ITEMS.length
    setSelected(CARGO_ITEMS[next])
  }

  return (
    <div className="panel cargo-layout">
      <div className="panel-head">
        <div className="panel-title">
          Cargo layout <span className="cargo-loaded-badge">Fully loaded</span>
        </div>
      </div>

      <div className="cargo-capacity-row">
        <div className="cargo-capacity">
          <div className="cargo-capacity-label">
            <span className="mono">{totalWeight.toLocaleString()}</span> / {TOTAL_WEIGHT_CAPACITY.toLocaleString()} lbs
            <span className="cargo-capacity-name">Weight capacity</span>
          </div>
          <div className="cargo-capacity-bar">
            <div className="cargo-capacity-fill amber" style={{ width: weightPct + '%' }} />
          </div>
        </div>
        <div className="cargo-capacity">
          <div className="cargo-capacity-label">
            <span className="mono">{totalVolume.toLocaleString()}</span> / {TOTAL_VOLUME_CAPACITY.toLocaleString()} ft³
            <span className="cargo-capacity-name">Volume capacity</span>
          </div>
          <div className="cargo-capacity-bar">
            <div className="cargo-capacity-fill red" style={{ width: Math.min(volumePct, 100) + '%' }} />
          </div>
        </div>
      </div>

      <div className="cargo-body">
        <div className="cargo-truck-col">
          <div className="cargo-truck-box">
            <img className="cargo-truck-img" src={truckImg} alt="Truck side view" />
            <div className="cargo-grid-overlay" ref={gridRef}>
              {CARGO_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={'cargo-card' + (item.id === selected.id ? ' selected' : '')}
                  onClick={() => setSelected(item)}
                >
                  <span className="cargo-card-id">{item.id}</span>
                  <span className="cargo-card-priority">
                    <span className={'badge-dot priority-' + item.priority} />
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="cargo-nav-arrows">
            <button onClick={() => step(-1)} aria-label="Previous item"><CaretLeft size={14} weight="bold" /></button>
            <span className="cargo-rotate-dot active" />
            <button onClick={() => step(1)} aria-label="Next item"><CaretRight size={14} weight="bold" /></button>
          </div>
        </div>

        <div className="cargo-detail">
          <div className="cargo-detail-list">
            {CARGO_ITEMS.map((item) => (
              <button
                key={item.id}
                className={'cargo-detail-row' + (item.id === selected.id ? ' active' : '')}
                onClick={() => setSelected(item)}
              >
                <span className="mono">{item.id}</span>
                <span className={'badge-dot priority-' + item.priority} />
                <span className="cargo-detail-row-priority">{PRIORITY_LABEL[item.priority]}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                className="cargo-detail-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div className="cargo-detail-card-head">
                  <span className="mono">{selected.id}</span>
                </div>
                <div className="cargo-detail-card-label">{selected.label}</div>

                <div className="cargo-detail-grid">
                  <div>
                    <div className="cargo-detail-key">Client</div>
                    <div className="cargo-detail-val">{selected.client}</div>
                  </div>
                  <div>
                    <div className="cargo-detail-key">Destination</div>
                    <div className="cargo-detail-val">{selected.destination}</div>
                  </div>
                  <div>
                    <div className="cargo-detail-key">Weight</div>
                    <div className="cargo-detail-val mono">{selected.weight}</div>
                  </div>
                  <div>
                    <div className="cargo-detail-key">Volume</div>
                    <div className="cargo-detail-val mono">{selected.volume}</div>
                  </div>
                </div>

                <div className="cargo-risk">
                  <div className="cargo-risk-label">
                    Risk score <span className="mono">{selected.risk}%</span>
                  </div>
                  <div className="cargo-capacity-bar">
                    <motion.div
                      className={'cargo-capacity-fill ' + (selected.risk > 60 ? 'red' : selected.risk > 30 ? 'amber' : 'green')}
                      initial={{ width: 0 }}
                      animate={{ width: selected.risk + '%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {selected.fragile && (
                  <div className="cargo-fragile-note">
                    Fragile · handle with care, shock-absorbing packaging required.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
