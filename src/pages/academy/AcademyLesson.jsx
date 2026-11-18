import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { askAdvisor, getAcademyMe, saveProgress } from '../../api/academy'
import { lessonByNo, lessonFile } from '../../data/academyLessons'
import {
  ensureStorageOwner, hasAnything, hydrateFromServer, readLessonState, stateKey, toProgressBody, writeMode,
} from '../../data/academyStorage'
import '../PageHeader.css'
import './academy.css'

const SYNC_MS = 3000

export default function AcademyLesson() {
  const params = useParams()
  const no = /^\d+$/.test(params.no ?? '') ? Number(params.no) : 0
  const lesson = lessonByNo(no)
  if (!lesson) return <Navigate to="/academy" replace />
  // key: switching lessons starts a clean instance (state, timers, frame).
  return <LessonView key={no} lesson={lesson} />
}

function LessonView({ lesson }) {
  const no = lesson.no
  const [ready, setReady] = useState(false)
  const [notes, setNotes] = useState([])
  const [mode, setMode] = useState('self')
  const [reloadKey, setReloadKey] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const { user } = useAuth()
  const userId = user?.id
  const lastKey = useRef(null)
  const forbidden = useRef(false) // set on 403: stop retrying the upload

  // Server first, frame second: the lesson file reads localStorage when it
  // loads, so what the server knows must already be there.
  useEffect(() => {
    const controller = new AbortController()
    // Before anything reads the lesson keys: another account's progress must go.
    ensureStorageOwner(userId)
    getAcademyMe(controller.signal)
      .then((me) => {
        const row = me.lessons.find((l) => l.lessonNo === no)
        const state = hydrateFromServer(no, row)
        setMode(state.mode)
        setNotes(me.notes.filter((n) => n.lessonNo === no || n.lessonNo == null))
        // What the server already holds needs no second upload.
        if (row) lastKey.current = stateKey({ exitsDone: row.exitsDone ?? {}, quiz: row.quiz ?? {}, mode: row.mode })
      })
      .catch((err) => {
        if (err?.code === 'FORBIDDEN') {
          forbidden.current = true
          setBlocked(true)
          return
        }
        // Offline: the lesson still opens from this browser's own copy.
        setMode(readLessonState(no).mode)
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true)
      })
    return () => controller.abort()
  }, [no, userId])

  const sync = useCallback(() => {
    if (forbidden.current) return
    const state = readLessonState(no)
    const k = stateKey(state)
    if (k === lastKey.current || !hasAnything(state)) return
    lastKey.current = k
    saveProgress(no, toProgressBody(state)).catch((err) => {
      if (err?.code === 'FORBIDDEN') {
        forbidden.current = true
        return
      }
      lastKey.current = null // try again on the next tick
    })
  }, [no])

  useEffect(() => {
    if (!ready) return undefined
    const timer = setInterval(sync, SYNC_MS)
    const onStorage = (e) => { if (e.key && e.key.startsWith(`ds-l${no}-`)) sync() }
    const onVisibility = () => { if (document.visibilityState === 'hidden') sync() }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      sync()
    }
  }, [ready, no, sync])

  function chooseMode(next) {
    if (next === mode) return
    writeMode(no, next)
    setMode(next)
    setReloadKey((k) => k + 1) // the lesson file reads its mode on load
    sync()
  }

  return (
    <div className="ac-page">
      <div className="ac-lesson-head">
        <div>
          <div className="ac-lesson-title">{no}-dars. {lesson.title}</div>
          <div className="page-sub"><Link to="/academy">Hamma darslar</Link> · {lesson.week}-hafta · {lesson.minutes} daqiqa</div>
        </div>
        <div className="ac-seg" role="group" aria-label="Rejim">
          <button type="button" aria-pressed={mode === 'self'} onClick={() => chooseMode('self')}>Mustaqil</button>
          <button type="button" aria-pressed={mode === 'teach'} onClick={() => chooseMode('teach')}>Darsda</button>
        </div>
      </div>

      <div className="ac-lesson">
        {blocked ? (
          <div className="ac-frame ac-error">Hisobingiz hali Academy‘ga ulanmagan. Mentoringizga murojaat qiling.</div>
        ) : ready ? (
          <iframe
            key={reloadKey}
            className="ac-frame"
            title={`${no}-dars. ${lesson.title}`}
            src={lessonFile(no)}
          />
        ) : (
          <div className="ac-frame" aria-busy="true" />
        )}

        <aside className="ac-side">
          <div className="ac-panel">
            <h2>Amaliy topshiriq</h2>
            <Link className="ac-btn" to={lesson.simulatorPath}>{lesson.simulatorLabel}</Link>
          </div>
          <Advisor lessonNo={no} />
          <div className="ac-panel">
            <h2>Mentor izohlari</h2>
            {notes.length === 0 && <div className="ac-muted">Hozircha izoh yo‘q.</div>}
            {notes.map((n) => (
              <div className="ac-note" key={n.id}>
                <div>{n.body}</div>
                <div className="ac-note-by">{n.authorName ?? 'Mentor'} · {new Date(n.createdAt).toLocaleDateString('en-GB')}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Advisor({ lessonNo }) {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const text = message.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const res = await askAdvisor(lessonNo, text)
      setAnswer(res.available && res.reply ? res.reply : 'Dispatcher-maslahatchi tez orada ishga tushadi. Hozircha savolingizni mentorga yozing.')
    } catch {
      setAnswer('Hozir javob olib bo‘lmadi. Keyinroq urinib ko‘ring.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ac-panel">
      <h2>Maslahatchi</h2>
      <form className="ac-advisor-row" onSubmit={submit}>
        <input
          className="ac-input"
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Savolingiz"
          aria-label="Savolingiz"
        />
        <button className="ac-btn" type="submit" disabled={busy || !message.trim()}>Yuborish</button>
      </form>
      {answer && <div className="ac-muted" style={{ marginTop: 8 }}>{answer}</div>}
    </div>
  )
}
