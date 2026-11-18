import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChatCircleDots, ListChecks, Moon, Notebook, Sun, X } from '@phosphor-icons/react'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../context/AuthContext'
import { askAdvisor, getAcademyMe, saveProgress } from '../../api/academy'
import { lessonByNo, lessonFile } from '../../data/academyLessons'
import {
  ensureStorageOwner, hasAnything, hydrateFromServer, readLessonState, stateKey, toProgressBody, writeMode,
} from '../../data/academyStorage'
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
    writeMode(no, 'self') // class mode is its own screen; see below
    getAcademyMe(controller.signal)
      .then((me) => {
        const row = me.lessons.find((l) => l.lessonNo === no)
        hydrateFromServer(no, row)
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

  // The lesson file always opens in its own self-study mode. Class mode is a
  // separate screen for mentors (/academy/class/:no), so the stored mode is
  // pinned here and never carries a leftover "teach" into a student's lesson.
  // The advisor's text lives here, not in the drawer: closing the drawer unmounts it.
  const [advisor, setAdvisor] = useState({ message: '', answer: '', busy: false })
  const [panel, setPanel] = useState(null) // null | 'task' | 'advisor' | 'notes'
  const frameRef = useRef(null)
  const closeRef = useRef(null)
  const toggleRefs = useRef({})
  const { theme, toggleTheme } = useTheme()
  const isMentor = user?.isMentor || user?.isAdmin

  const postTheme = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'ds-theme', theme }, window.location.origin)
  }, [theme])
  useEffect(() => { postTheme() }, [postTheme])

  useEffect(() => {
    if (!panel) return undefined
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setPanel(null)
      toggleRefs.current[panel]?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel])

  function closePanel() {
    const current = panel
    setPanel(null)
    if (current) toggleRefs.current[current]?.focus()
  }

  function togglePanel(id) {
    setPanel((current) => (current === id ? null : id))
  }

  const PANELS = [
    { id: 'task', label: 'Topshiriq', title: 'Amaliy topshiriq', Icon: ListChecks },
    { id: 'advisor', label: 'Maslahatchi', title: 'Maslahatchi', Icon: ChatCircleDots },
    { id: 'notes', label: 'Izohlar', title: 'Mentor izohlari', Icon: Notebook, badge: notes.length },
  ]
  const active = PANELS.find((p) => p.id === panel)

  return (
    <div className="ac-focus">
      <header className="ac-focus-bar">
        <Link className="ac-focus-btn" to="/academy" aria-label="Hamma darslar">
          <ArrowLeft size={16} weight="bold" />
          <span className="ac-focus-label">Hamma darslar</span>
        </Link>
        <div className="ac-focus-title">{no}-dars. {lesson.title}</div>
        {isMentor && (
          <Link className="ac-focus-btn" to={`/academy/class/${no}`}>
            <span>Darsda ochish</span>
          </Link>
        )}
        {PANELS.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            type="button"
            ref={(el) => { toggleRefs.current[id] = el }}
            className="ac-focus-btn"
            aria-pressed={panel === id}
            aria-controls={`ac-drawer-${id}`}
            onClick={() => togglePanel(id)}
          >
            <Icon size={16} weight="bold" />
            <span className="ac-focus-label">{label}</span>
            {badge > 0 && <span className="ac-focus-badge">{badge}</span>}
          </button>
        ))}
        <button
          type="button"
          className="ac-focus-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
        </button>
      </header>

      <div className="ac-focus-body">
        {blocked ? (
          <div className="ac-focus-frame ac-error">Hisobingiz hali Academy‘ga ulanmagan. Mentoringizga murojaat qiling.</div>
        ) : ready ? (
          <iframe
            ref={frameRef}
            className="ac-focus-frame"
            title={`${no}-dars. ${lesson.title}`}
            src={lessonFile(no)}
            onLoad={postTheme}
          />
        ) : (
          <div className="ac-focus-frame" aria-busy="true" />
        )}

        {panel && <div className="ac-drawer-scrim" onClick={closePanel} aria-hidden="true" />}
        <AnimatePresence>
          {panel && (
            <motion.aside
              key="drawer"
              className="ac-drawer"
              role="dialog"
              aria-labelledby="ac-drawer-title"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="ac-drawer-head">
                <h2 id="ac-drawer-title">{active?.title}</h2>
                <button ref={closeRef} type="button" className="ac-focus-btn" onClick={closePanel} aria-label="Yopish">
                  <X size={16} weight="bold" />
                </button>
              </div>
              {/* All three stay mounted: the advisor's answer must survive closing the drawer. */}
              <div id="ac-drawer-task" hidden={panel !== 'task'}>
                <Link className="ac-btn" to={lesson.simulatorPath}>{lesson.simulatorLabel}</Link>
              </div>
              <div id="ac-drawer-advisor" hidden={panel !== 'advisor'}>
                <Advisor lessonNo={no} state={advisor} setState={setAdvisor} />
              </div>
              <div id="ac-drawer-notes" hidden={panel !== 'notes'}>
                {notes.length === 0 && <div className="ac-muted">Hozircha izoh yo‘q.</div>}
                {notes.map((n) => (
                  <div className="ac-note" key={n.id}>
                    <div>{n.body}</div>
                    <div className="ac-note-by">{n.authorName ?? 'Mentor'} · {new Date(n.createdAt).toLocaleDateString('en-GB')}</div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Advisor({ lessonNo, state, setState }) {
  const { message, answer, busy } = state
  const setMessage = (v) => setState((s) => ({ ...s, message: v }))
  const setAnswer = (v) => setState((s) => ({ ...s, answer: v }))
  const setBusy = (v) => setState((s) => ({ ...s, busy: v }))

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
    <div>
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
