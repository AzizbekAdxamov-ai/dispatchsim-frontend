import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addNote, getStudent } from '../../api/academy'
import { ACADEMY_LESSONS, EXITS_PER_LESSON } from '../../data/academyLessons'
import '../PageHeader.css'
import './academy.css'

const QUIZ_LABELS = { qz: 'Yakuniy savollar', sim: 'Amaliy kun', exa: 'A variant', exb: 'B variant' }

export default function MentorStudent() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [lessonNo, setLessonNo] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (signal) => {
    try {
      setData(await getStudent(id, signal))
    } catch (err) {
      if (err?.name !== 'AbortError') setError('O‘quvchi ma‘lumotini yuklab bo‘lmadi.')
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function onSubmit(e) {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await addNote(id, { body: body.trim(), lessonNo: lessonNo === '' ? null : Number(lessonNo) })
      setBody('')
      await load()
    } catch {
      setError('Izohni saqlab bo‘lmadi.')
    } finally {
      setBusy(false)
    }
  }

  const byNo = new Map((data?.lessons ?? []).map((l) => [l.lessonNo, l]))

  return (
    <div className="ac-page">
      <div className="page-head">
        <div>
          <div className="page-title">{data?.student?.name ?? 'O‘quvchi'}</div>
          <div className="page-sub"><Link to="/academy/mentor">Mentor paneli</Link> · {data?.student?.email ?? ''}</div>
        </div>
      </div>

      {error && <div className="ac-error">{error}</div>}

      <div className="ac-detail" style={{ marginBottom: 16 }}>
        {ACADEMY_LESSONS.map((l) => {
          const row = byNo.get(l.no)
          const count = row?.exitsCount ?? 0
          const quiz = Object.entries(row?.quiz ?? {})
          return (
            <div className="ac-panel" key={l.no} style={{ marginBottom: 0 }}>
              <h2>{l.no}-dars. {l.title}</h2>
              <span className={count >= EXITS_PER_LESSON ? 'ac-cell ac-cell-full' : count > 0 ? 'ac-cell ac-cell-part' : 'ac-cell'}>
                {count}/{EXITS_PER_LESSON}
              </span>
              {quiz.map(([k, v]) => (
                <div className="ac-muted" key={k}>{QUIZ_LABELS[k] ?? k}: <span className="ac-mono">{v}</span></div>
              ))}
              {row?.completedAt && <div className="ac-muted">Tugatilgan: {new Date(row.completedAt).toLocaleDateString('en-GB')}</div>}
            </div>
          )
        })}
      </div>

      <div className="ac-panel">
        <h2>Izohlar</h2>
        <form className="ac-form" onSubmit={onSubmit}>
          <select className="ac-input" value={lessonNo} onChange={(e) => setLessonNo(e.target.value)} aria-label="Dars">
            <option value="">Umumiy izoh</option>
            {ACADEMY_LESSONS.map((l) => <option key={l.no} value={l.no}>{l.no}-dars</option>)}
          </select>
          <textarea className="ac-input" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Izoh yozing" aria-label="Izoh" />
          <div><button className="ac-btn" type="submit" disabled={busy || !body.trim()}>Saqlash</button></div>
        </form>
        {(data?.notes ?? []).map((n) => (
          <div className="ac-note" key={n.id}>
            <div>{n.body}</div>
            <div className="ac-note-by">{n.lessonNo ? `${n.lessonNo}-dars · ` : ''}{n.authorName ?? 'Mentor'} · {new Date(n.createdAt).toLocaleDateString('en-GB')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
