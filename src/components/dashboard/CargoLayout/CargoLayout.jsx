import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import truckSide from '../../../assets/truck-side.webp'
import truckSlate from '../../../assets/truck-side-night.png'
import { useTheme } from '../../../theme/ThemeProvider'
import { formatEquipment } from '../../../data/equipmentTypes'
import '../Panel.css'
import './CargoLayout.css'

gsap.registerPlugin(useGSAP)

// What is on the road right now.
//
// This panel was removed on 2026-09-08 and is back with real data behind
// it. What it used to show was ten hardcoded shipments from a cargoData.js
// file -- invented clients (TechFlow Inc., MedLine Partners), invented
// SHP- numbers, a trailer marked "Fully loaded" on the dashboard of a
// company that might own nothing, and a coloured "Risk score" grading each
// one. The panel was never the problem; the data was.
//
// Every card below is a load this company actually dispatched and has not
// yet delivered. Gone with the fake rows: `client` (there is no client
// model -- there is a broker), the SHP- ids (a load has its own id),
// `volume` (nothing measures it), and `risk` and `priority`, which were
// the program grading freight instead of describing it.
//
// The truck is drawn twice on purpose -- a daylight photograph and a night
// one -- because the dashboard has a light and a dark theme and one image
// looks wrong in the other. That was a deliberate piece of the original
// design and it is kept exactly as it was.

// loads_weight CHECK allows 500-45,000 lbs. The ceiling is the federal
// 80,000 lb gross limit minus a tractor and trailer, which is what makes
// it a real number rather than a chosen one.
const MAX_PAYLOAD_LBS = 45000

// A load is in transit when it has been dispatched and not delivered.
// 'warn' and 'crit' are still on the road -- a late truck is a truck.
const IN_TRANSIT = new Set(['ontime', 'warn', 'crit'])

const STATUS_LABEL = {
  ontime: 'On time',
  warn: 'Running behind',
  crit: 'Past the promise',
}

export default function CargoLayout({ loads = [] }) {
  const gridRef = useRef(null)
  const { theme } = useTheme()
  const truckImg = theme === 'dark' ? truckSlate : truckSide

  const onRoad = loads.filter((l) => IN_TRANSIT.has(l.status))

  const [selectedId, setSelectedId] = useState(null)
  // Declared AFTER onRoad on purpose. An effect that referenced it above
  // its own const blanked this whole app once (2026-09-08, BrokerChat).
  useEffect(() => {
    if (onRoad.length === 0) { setSelectedId(null); return }
    if (!onRoad.some((l) => l.id === selectedId)) setSelectedId(onRoad[0].id)
  }, [onRoad, selectedId])

  const selected = onRoad.find((l) => l.id === selectedId) ?? null

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.cargo-card', {
        opacity: 0, y: 14, scale: 0.92, duration: 0.45, stagger: 0.06, ease: 'power2.out',
      })
    })
  }, { scope: gridRef, dependencies: [onRoad.length] })

  function step(direction) {
    if (onRoad.length === 0) return
    const i = onRoad.findIndex((l) => l.id === selectedId)
    const next = (i + direction + onRoad.length) % onRoad.length
    setSelectedId(onRoad[next].id)
  }

  const payloadPct = selected
    ? Math.min(100, Math.round((selected.weightLbs / MAX_PAYLOAD_LBS) * 100))
    : 0

  return (
    <div className="panel cargo-layout">
      <div className="panel-head">
        <div className="panel-title">
          On the road <span className="panel-count">{onRoad.length}</span>
        </div>
        <Link className="panel-action" to="/loads">View all</Link>
      </div>

      <div className="cargo-body">
        <div className="cargo-truck-col">
          <div className="cargo-truck-box">
            <img className="cargo-truck-img" src={truckImg} alt="Truck side view" />
            <div className="cargo-grid-overlay" ref={gridRef}>
              {onRoad.map((load) => (
                <button
                  key={load.id}
                  className={'cargo-card' + (load.id === selectedId ? ' selected' : '')}
                  onClick={() => setSelectedId(load.id)}
                >
                  <span className="cargo-card-id mono">{load.id}</span>
                  <span className="cargo-card-commodity">{load.commodity}</span>
                </button>
              ))}
            </div>
          </div>

          {onRoad.length > 1 && (
            <div className="cargo-nav-arrows">
              <button onClick={() => step(-1)} aria-label="Previous load"><CaretLeft size={14} weight="bold" /></button>
              <span className="cargo-rotate-dot active" />
              <button onClick={() => step(1)} aria-label="Next load"><CaretRight size={14} weight="bold" /></button>
            </div>
          )}
        </div>

        <div className="cargo-detail">
          {onRoad.length === 0 ? (
            // The honest empty state. A company with nothing dispatched has
            // an empty trailer, and saying so is the whole point.
            <div className="cargo-empty">
              Nothing in transit. Dispatch a booked load and it appears here.
            </div>
          ) : (
            <>
              <div className="cargo-detail-list">
                {onRoad.map((load) => (
                  <button
                    key={load.id}
                    className={'cargo-detail-row' + (load.id === selectedId ? ' active' : '')}
                    onClick={() => setSelectedId(load.id)}
                  >
                    <span className="mono">{load.id}</span>
                    <span className="cargo-detail-row-lane">
                      {load.destinationCity}, {load.destinationState}
                    </span>
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
                      <Link className="mono" to={`/loads/${selected.id}`}>{selected.id}</Link>
                      {/* The status in words, with no colour attached. How
                          late a load is, is a fact; which colour that
                          deserves is a verdict. */}
                      <span className="cargo-detail-status">{STATUS_LABEL[selected.status]}</span>
                    </div>
                    <div className="cargo-detail-card-label">{selected.commodity}</div>

                    <div className="cargo-detail-grid">
                      <div>
                        <div className="cargo-detail-key">Broker</div>
                        <div className="cargo-detail-val">{selected.broker}</div>
                      </div>
                      <div>
                        <div className="cargo-detail-key">Lane</div>
                        <div className="cargo-detail-val">
                          {selected.originCity}, {selected.originState} → {selected.destinationCity}, {selected.destinationState}
                        </div>
                      </div>
                      <div>
                        <div className="cargo-detail-key">Equipment</div>
                        <div className="cargo-detail-val">
                          {formatEquipment({
                            equipmentType: selected.equipmentType,
                            equipmentLength: `${selected.equipmentLengthFt}ft`,
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="cargo-detail-key">Distance</div>
                        <div className="cargo-detail-val mono">{selected.distanceMi.toLocaleString()} mi</div>
                      </div>
                    </div>

                    {/* Payload against the legal ceiling. One bar, for the
                        selected load -- the old panel summed ten items into
                        one trailer, but each load here IS a trailer. */}
                    <div className="cargo-payload">
                      <div className="cargo-payload-label">
                        <span className="mono">{selected.weightLbs.toLocaleString()}</span>
                        {' / '}{MAX_PAYLOAD_LBS.toLocaleString()} lbs
                        <span className="cargo-capacity-name">Payload</span>
                      </div>
                      <div className="cargo-capacity-bar">
                        <motion.div
                          className="cargo-capacity-fill"
                          initial={{ width: 0 }}
                          animate={{ width: payloadPct + '%' }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
