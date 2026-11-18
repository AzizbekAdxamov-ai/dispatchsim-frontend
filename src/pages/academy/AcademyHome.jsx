import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getAcademyMe } from '../../api/academy'
import { ACADEMY_LESSONS, EXITS_PER_LESSON, LESSON_COUNT, WEEK_COUNT } from '../../data/academyLessons'
import '../PageHeader.css'
import './academy.css'

const R = 20
const C = 2 * Math.PI * R

function Ring({ done }) {
  const ratio = Math.min(1, done / EXITS_PER_LESSON)
  return (
    <svg className="ac-ring" width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${done} / ${EXITS_PER_LESSON}`}>
      <circle className="ac-ring-bg" cx="26" cy="26" r={R} strokeWidth="4" />
      <motion.circle
        className="ac-ring-fg"
        cx="26" cy="26" r={R} strokeWidth="4"
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - ratio) }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        transform="rotate(-90 26 26)"
      />
      <text className="ac-ring-text" x="26" y="30" textAnchor="middle">{done}/{EXITS_PER_LESSON}</text>
    </svg>
  )
}

export default function AcademyHome() {
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getAcademyMe(controller.signal)
      .then(setMe)
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err?.code === 'FORBIDDEN'
          ? 'Hisobingiz hali Academy‘ga ulanmagan. Mentoringizga murojaat qiling.'
          : 'Ma‘lumotni yuklab bo‘lmadi. Qayta urinib ko‘ring.')
      })
    return () => controller.abort()
  }, [])

  const byNo = new Map((me?.lessons ?? []).map((l) => [l.lessonNo, l]))
  const doneOf = (no) => byNo.get(no)?.exitsCount ?? 0
  const total = ACADEMY_LESSONS.reduce((sum, l) => sum + doneOf(l.no), 0)
  const next = ACADEMY_LESSONS.find((l) => doneOf(l.no) < EXITS_PER_LESSON) ?? null

  return (
    <div className="ac-page">
      <div className="page-head">
        <div>
          <div className="page-title">Dispatcher kursi</div>
          <div className="page-sub">
            {me?.cohort ? `Guruh: ${me.cohort.name}` : 'Hali guruhga qo‘shilmagansiz'}
            {me?.mentor ? ` · Mentor: ${me.mentor.name}` : ''}
          </div>
        </div>
      </div>

      {error && <div className="ac-error">{error}</div>}

      <div className="ac-panel ac-summary">
        <div>
          <div className="ac-summary-total">{total}/{LESSON_COUNT * EXITS_PER_LESSON}</div>
          <div className="ac-muted">bajarilgan nuqta (EXIT)</div>
        </div>
        {next ? (
          <Link className="ac-btn" to={`/academy/lesson/${next.no}`}>
            {total === 0 ? 'Boshlash' : 'Davom etish'}: {next.no}-dars
          </Link>
        ) : (
          <div className="ac-muted">Hamma darslar tugadi</div>
        )}
      </div>

      {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map((week) => (
        <section className="ac-week" key={week}>
          <div className="ac-week-title">{week}-hafta</div>
          <div className="ac-cards">
            {ACADEMY_LESSONS.filter((l) => l.week === week).map((l) => (
              <Link className="ac-card" key={l.no} to={`/academy/lesson/${l.no}`}>
                <Ring done={doneOf(l.no)} />
                <div>
                  <div className="ac-card-title">{l.no}-dars. {l.title}</div>
                  <div className="ac-card-meta ac-mono">{l.minutes} daqiqa</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
