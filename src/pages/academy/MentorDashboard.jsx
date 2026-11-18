import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addMember, createCohort, getCohortStudents, listCohorts } from '../../api/academy'
import { ACADEMY_LESSONS, EXITS_PER_LESSON, lessonFile } from '../../data/academyLessons'
import { useAuth } from '../../context/AuthContext'
import { ensureStorageOwner, writeMode } from '../../data/academyStorage'
import '../PageHeader.css'
import './academy.css'

const MODES = [
  { key: 'offline', label: 'Offlayn' },
  { key: 'online', label: 'Onlayn' },
]

function errorText(err) {
  if (err?.code === 'ACADEMY_EMAIL_NOT_FOUND') return 'Bu email bilan hisob topilmadi.'
  if (err?.code === 'NETWORK_ERROR') return 'Serverga ulanib bo‘lmadi.'
  return 'Bajarib bo‘lmadi. Qayta urinib ko‘ring.'
}

function cellClass(count) {
  if (count >= EXITS_PER_LESSON) return 'ac-cell ac-cell-full'
  if (count > 0) return 'ac-cell ac-cell-part'
  return 'ac-cell'
}

function openInClass(no, userId) {
  ensureStorageOwner(userId)
  writeMode(no, 'teach')
  window.open(lessonFile(no), '_blank')
}

export default function MentorDashboard() {
  const { user } = useAuth()
  const [cohorts, setCohorts] = useState([])
  const [selected, setSelected] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('offline')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const loadCohorts = useCallback(async (signal) => {
    try {
      const list = await listCohorts(signal)
      setCohorts(list)
      setSelected((cur) => cur ?? list[0]?.id ?? null)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(errorText(err))
    }
  }, [])

  const loadStudents = useCallback(async (id, signal) => {
    try {
      const res = await getCohortStudents(id, signal)
      setStudents(res.students)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(errorText(err))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadCohorts(controller.signal)
    return () => controller.abort()
  }, [loadCohorts])

  useEffect(() => {
    if (!selected) return undefined
    const controller = new AbortController()
    loadStudents(selected, controller.signal)
    return () => controller.abort()
  }, [selected, loadStudents])

  async function onCreate(e) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const created = await createCohort({ name: name.trim(), mode })
      setName('')
      await loadCohorts()
      if (created?.id) setSelected(created.id)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(e) {
    e.preventDefault()
    if (!email.trim() || !selected || busy) return
    setBusy(true)
    setError('')
    try {
      await addMember(selected, email.trim())
      setEmail('')
      await loadStudents(selected)
      await loadCohorts()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ac-page">
      <div className="page-head">
        <div>
          <div className="page-title">Mentor paneli</div>
          <div className="page-sub">Guruhlar va o‘quvchilar natijasi</div>
        </div>
      </div>

      {error && <div className="ac-error">{error}</div>}

      <div className="ac-panel">
        <h2>Guruhlar</h2>
        <div className="ac-tabs">
          {cohorts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={'ac-btn ac-btn-sm' + (c.id === selected ? '' : ' ac-btn-ghost')}
              onClick={() => setSelected(c.id)}
            >
              {c.name} · {c.studentCount}
            </button>
          ))}
          {cohorts.length === 0 && <span className="ac-muted">Hali guruh yo‘q.</span>}
        </div>
        <form className="ac-row" onSubmit={onCreate}>
          <input className="ac-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Yangi guruh nomi" aria-label="Yangi guruh nomi" />
          <select className="ac-input" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Guruh turi">
            {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button className="ac-btn" type="submit" disabled={busy || !name.trim()}>Guruh yaratish</button>
        </form>
        {selected && (
          <form className="ac-row" onSubmit={onAdd}>
            <input className="ac-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="O‘quvchi emaili" aria-label="O‘quvchi emaili" />
            <button className="ac-btn ac-btn-ghost" type="submit" disabled={busy || !email.trim()}>O‘quvchi qo‘shish</button>
          </form>
        )}
      </div>

      {selected && (
        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>O‘quvchi</th>
                {ACADEMY_LESSONS.map((l) => (
                  <th key={l.no}>
                    <div className="ac-mono">{l.no}</div>
                    <button type="button" className="ac-btn ac-btn-ghost ac-btn-sm" onClick={() => openInClass(l.no, user?.id)} title={`${l.no}-darsni sinfda ochish`}>Darsda</button>
                  </th>
                ))}
                <th>Oxirgi faollik</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const byNo = new Map(s.lessons.map((l) => [l.lessonNo, l]))
                return (
                  <tr key={s.id}>
                    <td><Link to={`/academy/mentor/students/${s.id}`}>{s.name}</Link></td>
                    {ACADEMY_LESSONS.map((l) => {
                      const row = byNo.get(l.no)
                      const count = row?.exitsCount ?? 0
                      const qz = row?.quiz?.qz
                      return (
                        <td key={l.no}>
                          <span className={cellClass(count)} title={`${count}/${EXITS_PER_LESSON}`}>
                            {count}{qz != null && <small>{qz}/8</small>}
                          </span>
                        </td>
                      )
                    })}
                    <td className="ac-muted">{s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('en-GB') : '—'}</td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr><td colSpan={ACADEMY_LESSONS.length + 2} className="ac-muted">Bu guruhda hali o‘quvchi yo‘q.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
