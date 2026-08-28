import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '../../api/client'
import { ROLES, roleLabel, sortRoles } from '../../data/roleRoutes'
import Toggle from '../Toggle'
import './AccessModal.css'

function saveErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'LAST_ADMIN') return 'At least one administrator must remain.'
    if (err.code === 'SELF_ADMIN_CHANGE') return 'You cannot change your own administrator access.'
    if (err.code === 'FORBIDDEN') return 'You no longer have access to this area.'
    if (err.code === 'USER_NOT_FOUND') return 'This account no longer exists.'
    if (err.code === 'VALIDATION_ERROR') return 'Check the fields and try again.'
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  }
  return 'Something went wrong. Please try again.'
}

function rolesEqual(a, b) {
  if (a.size !== b.size) return false
  for (const key of a) {
    if (!b.has(key)) return false
  }
  return true
}

export default function AccessModal({ user, currentUser, onClose, onSaved }) {
  const [roles, setRoles] = useState(() => new Set(user.roles))
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const firstFieldRef = useRef(null)
  const panelRef = useRef(null)

  const isSelf = user.id === currentUser?.id
  const originalRoles = useMemo(() => new Set(user.roles), [user])
  const rolesChanged = !rolesEqual(roles, originalRoles)
  const adminChanged = isAdmin !== user.isAdmin
  const hasChanges = rolesChanged || adminChanged

  // Mirrors the server's pickActiveRole (backend/src/constants/roles.js):
  // ROLE_ORDER is the frontend's copy of the same ROLE_KEYS ordering. This
  // is only ever a preview for the admin — the server recomputes the real
  // value on save, admin.service.js's recomputeActiveRole.
  const previewNextActiveRole = sortRoles([...roles])[0] ?? null
  const willLoseActiveRole = Boolean(user.activeRole) && !roles.has(user.activeRole)

  const previousFocusRef = useRef(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    firstFieldRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    function getFocusable() {
      const nodes = panelRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      return nodes ? Array.from(nodes) : []
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !panelRef.current?.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function toggleRole(key) {
    setRoles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    if (!hasChanges) return
    setSaving(true)
    setError('')
    const body = {}
    if (rolesChanged) body.roles = sortRoles([...roles])
    if (adminChanged) body.isAdmin = isAdmin
    try {
      await api.patch(`/admin/users/${user.id}`, body, { auth: true })
      onSaved()
    } catch (err) {
      setError(saveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
      <motion.div
        className="admin-modal-backdrop"
        onMouseDown={handleBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <motion.div
          className="admin-modal"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-modal-title"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="admin-modal-head">
            <div id="admin-modal-title" className="admin-modal-name">{user.name}</div>
            <div className="mono admin-modal-email">{user.email}</div>
          </div>

          <div className="admin-modal-section">
            <div className="admin-modal-label">Workspaces</div>
            <div className="admin-role-grid">
              {ROLES.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  ref={i === 0 ? firstFieldRef : undefined}
                  className={'admin-role-option' + (roles.has(r.key) ? ' selected' : '')}
                  aria-pressed={roles.has(r.key)}
                  onClick={() => toggleRole(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="admin-modal-current">
              Current workspace: {user.activeRole ? roleLabel(user.activeRole) : 'None'}
            </div>
            {willLoseActiveRole && (
              <div className="admin-modal-warning">
                {roleLabel(user.activeRole)} is their current workspace — they will be moved to{' '}
                {previewNextActiveRole ? roleLabel(previewNextActiveRole) : 'no workspace'}.
              </div>
            )}
          </div>

          <div className="admin-modal-section">
            <div className="admin-modal-row">
              <div>
                <div className="admin-modal-label">Administrator access</div>
                {isSelf && (
                  <div className="admin-modal-hint">You cannot change your own administrator access.</div>
                )}
              </div>
              <Toggle checked={isAdmin} onChange={setIsAdmin} disabled={isSelf} />
            </div>
          </div>

          {error && <div className="admin-modal-error">{error}</div>}

          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-cancel" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="admin-modal-save"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
  )
}
