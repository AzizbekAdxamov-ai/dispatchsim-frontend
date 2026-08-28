import { useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Star } from '@phosphor-icons/react'
import { dispatchRating } from '../data/mockData'
import '../components/dashboard/Panel.css'
import '../components/dashboard/Charts.css'
import './PageHeader.css'
import './DispatchStatus.css'

gsap.registerPlugin(useGSAP)

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function Stars({ score, size = 13 }) {
  const full = Math.round(score)
  return (
    <span className="ds-stars" aria-label={score.toFixed(1) + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} weight={n <= full ? 'fill' : 'regular'} className={n <= full ? 'on' : ''} aria-hidden="true" />
      ))}
    </span>
  )
}

function RatingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">Rating: <b>{payload[0].value.toFixed(1)}</b></div>
    </div>
  )
}

export default function DispatchStatus() {
  const navigate = useNavigate()
  const r = dispatchRating
  const topGridRef = useRef(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.ds-metric-fill', {
        width: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power2.out',
        delay: 0.15,
      })
    })
  }, { scope: topGridRef, dependencies: [r] })

  return (
    <>
      <div className="page-head-plain">
        <div className="page-title">Dispatch status</div>
        <div className="page-sub">How brokers and partners rate your dispatch performance</div>
      </div>

      <motion.div className="ds-top-grid" ref={topGridRef} variants={container} initial="hidden" animate="show">
        <motion.div className="panel ds-score-card" variants={fadeUp}>
          <div className="ds-score-value mono">{r.overall.toFixed(1)}</div>
          <Stars score={r.overall} size={16} />
          <div className="ds-score-meta">Based on {r.totalReviews} broker reviews · {r.period}</div>
        </motion.div>

        {r.breakdown.map((b) => (
          <motion.div className="panel ds-metric-card" key={b.label} variants={fadeUp}>
            <div className="ds-metric-label">{b.label}</div>
            <div className={'ds-metric-value ' + b.tone}>{b.value}{b.unit}</div>
            <div className="ds-metric-bar">
              <div className={'ds-metric-fill ' + b.tone} style={{ width: b.value + '%' }} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            Rating trend
            <div className="panel-subtitle">Monthly average broker rating out of 5</div>
          </div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={r.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
                axisLine={{ stroke: 'var(--border-soft)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: 'var(--text-3)', fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                width={26}
              />
              <Tooltip content={<RatingTooltip />} cursor={{ stroke: 'var(--border-soft)' }} />
              <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel ds-reviews-panel">
        <div className="panel-head">
          <div className="panel-title">Recent broker feedback</div>
        </div>
        <motion.div className="ds-reviews-list" variants={container} initial="hidden" animate="show">
          {r.reviews.map((rev, i) => (
            <motion.div className="ds-review-row" key={i} variants={fadeUp}>
              <div className="ds-review-head">
                <span className="ds-review-broker">{rev.broker}</span>
                <Stars score={rev.score} />
                <button className="ds-review-load" onClick={() => navigate('/loads/' + rev.loadId)}>#{rev.loadId}</button>
                <span className="ds-review-date">{rev.date}</span>
              </div>
              <div className="ds-review-text">{rev.text}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  )
}
