import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import { changePassword } from '../../api/auth'
import { passwordFormProblem } from '../../utils/passwordRules'
import '../dashboard/Panel.css'
import '../../pages/Settings.css'

// Change-password panel shared by every settings page. All words come in via
// `copy` (see data/passwordCopy.js); `idPrefix` keeps input ids unique per page.
export default function ChangePasswordPanel({ idPrefix, copy }) {
  const { user, refreshUser } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function errorText(err) {
    if (err instanceof ApiError) return copy.errors[err.code] ?? copy.errors.unknown
    return copy.errors.unknown
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setDone(false)
    const problem = passwordFormProblem({ current, next })
    if (problem) {
      setError(copy.errors[problem])
      return
    }
    setError('')
    setBusy(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setDone(true)
      // Picks up the cleared must-change flag; a failed refresh is not worth an error here.
      await refreshUser().catch(() => {})
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head"><div className="panel-title">{copy.title}</div></div>
      <form className="settings-body" onSubmit={handleSubmit}>
        {user?.mustChangePassword && (
          <div className="settings-row-desc settings-notice" role="status">{copy.mustChangeNotice}</div>
        )}
        <div className="settings-field">
          <label htmlFor={`${idPrefix}-current-pw`}>{copy.currentLabel}</label>
          <input
            id={`${idPrefix}-current-pw`}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="settings-field">
          <label htmlFor={`${idPrefix}-new-pw`}>{copy.newLabel}</label>
          <input
            id={`${idPrefix}-new-pw`}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="••••••••"
          />
          <div className="settings-row-desc">{copy.hint}</div>
        </div>
        <div className="settings-save-row">
          <button type="submit" className="settings-save-btn" disabled={busy}>
            {busy ? copy.buttonBusy : copy.button}
          </button>
          {done && <span className="settings-saved-note" role="status">{copy.success}</span>}
          {error && <span className="settings-error-note" role="alert">{error}</span>}
        </div>
      </form>
    </div>
  )
}
