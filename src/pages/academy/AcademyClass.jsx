import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowCounterClockwise, ArrowLeft, CaretLeft, CaretRight, CornersIn, CornersOut, MoonStars, Pause, Play, Sun,
} from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../theme/ThemeProvider'
import { lessonByNo, lessonFile } from '../../data/academyLessons'
import { clearClassKeys } from '../../data/academyStorage'
import { FS_STEP, clampFs, formatClock, readFs, stepLabel, writeFs } from '../../data/academyClass'
import './academy.css'

const HIDE_MS = 2500
const KEYS = ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'f', 'F']

// Mentor's class screen: the lesson, full window, one part at a time, with a
// bar that gets out of the way. No progress is read or uploaded here.
export default function AcademyClass() {
  const params = useParams()
  const no = /^\d+$/.test(params.no ?? '') ? Number(params.no) : 0
  const lesson = lessonByNo(no)
  const { user } = useAuth()
  if (!lesson) return <Navigate to="/academy" replace />
  if (!(user?.isMentor || user?.isAdmin)) return <Navigate to={`/academy/lesson/${no}`} replace />
  // key: switching lessons starts a clean instance.
  return <ClassView key={no} lesson={lesson} />
}

function isEditable(t) {
  const tag = t?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t?.isContentEditable
}

function ClassView({ lesson }) {
  const no = lesson.no
  const { theme, toggleTheme } = useTheme()
  // Class keys start clean on every open; the frame must not read old answers.
  const [ready] = useState(() => { clearClassKeys(); return true })
  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [fs, setFs] = useState(readFs)
  const [shown, setShown] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [timer, setTimer] = useState({ running: false, deadline: 0, base: 0 })
  const [now, setNow] = useState(() => Date.now())
  const frameRef = useRef(null)
  const barRef = useRef(null)
  const hideRef = useRef(0)
  const itemsRef = useRef([])
  const indexRef = useRef(0)
  const fsRef = useRef(fs)
  const themeRef = useRef(theme)
  const noHover = useRef(typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches)
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled

  const post = useCallback((msg) => {
    frameRef.current?.contentWindow?.postMessage(msg, window.location.origin)
  }, [])

  const reveal = useCallback(() => {
    setShown(true)
    window.clearTimeout(hideRef.current)
    if (noHover.current) return
    hideRef.current = window.setTimeout(() => {
      if (barRef.current?.contains(document.activeElement)) return
      setShown(false)
    }, HIDE_MS)
  }, [])

  const go = useCallback((delta) => {
    const total = itemsRef.current.length
    if (!total) return
    post({ type: 'ds-goto', index: Math.min(total - 1, Math.max(0, indexRef.current + delta)) })
  }, [post])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const act = useCallback((key) => {
    if (key === 'ArrowRight' || key === 'PageDown') go(1)
    else if (key === 'ArrowLeft' || key === 'PageUp') go(-1)
    else if (key === 'f' || key === 'F') toggleFullscreen()
  }, [go, toggleFullscreen])

  const sendFs = useCallback((px) => post({ type: 'ds-fs', px }), [post])

  // Messages from the lesson frame (same origin, that frame only).
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return
      const d = e.data
      if (!d || typeof d !== 'object') return
      if (d.type === 'ds-sections' && Array.isArray(d.items)) {
        itemsRef.current = d.items
        setItems(d.items)
        sendFs(fsRef.current)
        post({ type: 'ds-theme', theme: themeRef.current })
      } else if (d.type === 'ds-section' && Number.isInteger(d.index)) {
        indexRef.current = d.index
        setIndex(d.index)
        // New part, new clock; a running clock keeps running.
        const minutes = itemsRef.current[d.index]?.minutes
        const base = minutes ? minutes * 60 : 0
        setTimer((t) => ({ running: t.running && !!minutes, deadline: Date.now() + base * 1000, base }))
        setNow(Date.now())
      } else if (d.type === 'ds-key' && typeof d.key === 'string') {
        act(d.key)
        reveal()
      } else if (d.type === 'ds-activity') {
        reveal()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [act, post, reveal, sendFs])

  // Keys while the app (not the frame) has focus.
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || isEditable(e.target)) return
      if (KEYS.includes(e.key)) {
        e.preventDefault()
        act(e.key)
        reveal()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [act, reveal])

  useEffect(() => {
    window.addEventListener('mousemove', reveal)
    const first = window.setTimeout(reveal, 0)
    return () => {
      window.removeEventListener('mousemove', reveal)
      window.clearTimeout(first)
      window.clearTimeout(hideRef.current)
    }
  }, [reveal])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    themeRef.current = theme
    post({ type: 'ds-theme', theme })
  }, [theme, post])

  useEffect(() => {
    if (!timer.running) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [timer.running])

  const current = items[index]
  const hasClock = !!current?.minutes
  const left = timer.running ? Math.ceil((timer.deadline - now) / 1000) : timer.base
  const over = hasClock && timer.running && left <= 0
  const visible = shown || over

  function togglePlay() {
    setTimer((t) => (t.running
      ? { running: false, deadline: 0, base: Math.ceil((t.deadline - Date.now()) / 1000) }
      : { running: true, deadline: Date.now() + t.base * 1000, base: t.base }))
    setNow(Date.now())
  }

  function resetTimer() {
    const base = current?.minutes ? current.minutes * 60 : 0
    setTimer((t) => ({ running: t.running, deadline: Date.now() + base * 1000, base }))
    setNow(Date.now())
  }

  function changeFs(delta) {
    const next = clampFs(fsRef.current + delta)
    fsRef.current = next
    setFs(next)
    writeFs(next)
    sendFs(next)
  }

  const total = items.length
  const prevOff = index === 0
  const nextOff = index >= total - 1

  return (
    <div className="acx-shell">
      {ready && (
        <iframe
          ref={frameRef}
          className="acx-frame"
          title={`${no}-dars. ${lesson.title}`}
          src={`${lessonFile(no)}?present=1`}
        />
      )}
      <div className="acx-hot" onMouseEnter={reveal} aria-hidden="true" />
      <header ref={barRef} className={'acx-bar' + (visible ? '' : ' acx-bar-off')} onFocus={reveal}>
        <Link className="acx-btn" to={`/academy/lesson/${no}`} aria-label="Chiqish">
          <ArrowLeft size={16} weight="bold" />
          <span className="acx-label">Chiqish</span>
        </Link>
        <div className="acx-title">
          <span className="acx-mono">{no}-dars</span>
          <span className="acx-title-text">{lesson.title}</span>
        </div>

        {total > 0 && (
          <>
            <nav className="acx-steps" aria-label="Dars bo‘limlari">
              {items.map((it) => (
                <button
                  key={it.index}
                  type="button"
                  className="acx-step"
                  aria-current={it.index === index ? 'step' : undefined}
                  title={it.title}
                  onClick={() => post({ type: 'ds-goto', index: it.index })}
                >
                  {stepLabel(it.index, total)}
                </button>
              ))}
            </nav>
            <div className="acx-arrows">
              <button type="button" className="acx-btn" onClick={() => go(-1)} disabled={prevOff} aria-label="Oldingi">
                <CaretLeft size={16} weight="bold" />
              </button>
              <span className="acx-mono acx-count">{index + 1}/{total}</span>
              <button type="button" className="acx-btn" onClick={() => go(1)} disabled={nextOff} aria-label="Keyingi">
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </>
        )}

        {hasClock && (
          <div className={'acx-timer' + (over ? ' acx-timer-over' : '')}>
            <span className="acx-mono acx-clock">{formatClock(left)}</span>
            <button type="button" className="acx-btn" onClick={togglePlay} aria-label={timer.running ? 'Pauza' : 'Boshlash'}>
              {timer.running ? <Pause size={16} weight="bold" /> : <Play size={16} weight="bold" />}
            </button>
            <button type="button" className="acx-btn" onClick={resetTimer} aria-label="Qayta boshlash">
              <ArrowCounterClockwise size={16} weight="bold" />
            </button>
          </div>
        )}

        <div className="acx-tools">
          <button type="button" className="acx-btn" onClick={() => changeFs(-FS_STEP)} aria-label="Shriftni kichraytirish">A−</button>
          <button type="button" className="acx-btn" onClick={() => changeFs(FS_STEP)} aria-label="Shriftni kattalashtirish">A+</button>
          {canFullscreen && (
            <button type="button" className="acx-btn" onClick={toggleFullscreen} aria-label={fullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekran'}>
              {fullscreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
            </button>
          )}
          <button
            type="button"
            className="acx-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <MoonStars size={16} weight="bold" />}
          </button>
        </div>
      </header>
    </div>
  )
}
