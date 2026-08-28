import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { ROLES } from '../../data/roleRoutes'
import './AccessModal.css'
import './InviteModal.css'

function createErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'VALIDATION_ERROR') return 'Check the fields and try again.'
    if (err.code === 'INVITE_CODE_TAKEN') return 'Could not generate a unique code. Try again.'
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  }
  return 'Something went wrong. Please try again.'
}

function inviteLink(code) {
  return `${window.location.origin}/register?invite=${code}`
}

export default function InviteModal({ onClose, onCreated }) {
  const [label, setLabel] = useState('')
  const [prefix, setPrefix] = useState('')
  const [roles, setRoles] = useState(() => new Set())
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const firstFieldRef = useRef(null)
  const panelRef = useRef(null)
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (roles.size === 0 || saving) return
    setSaving(true)
    setError('')
    const body = {
      label: label.trim() || undefined,
      prefix: prefix.trim() || undefined,
      // ROLES is already in ROLE_ORDER, so iterating it (rather than the
      // Set's insertion order) keeps the roles array in canonical order —
      // matching what admin.schemas.js's rolesArray dedupes/accepts and
      // what pickActiveRole treats as "first" on the server.
      roles: ROLES.map((r) => r.key).filter((key) => roles.has(key)),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
    }
    try {
      const invite = await api.post('/admin/invites', body, { auth: true })
      setCreated(invite)
    } catch (err) {
      setError(createErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(inviteLink(created.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable/denied — the link is still visible to copy by hand.
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
        aria-labelledby="invite-modal-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {created ? (
          <>
            <div className="admin-modal-head">
              <div id="invite-modal-title" className="admin-modal-name">Invite code created</div>
              <div className="admin-modal-hint">
                Share this link with the group — it opens their first workspace automatically.
              </div>
            </div>
            <div className="admin-modal-section">
              <div className="admin-modal-label">Invite link</div>
              <div className="invite-link-row">
                <span className="mono invite-link-text">{inviteLink(created.code)}</span>
                <button type="button" className="invite-copy-btn" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-modal-save" onClick={onCreated}>Done</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="admin-modal-head">
              <div id="invite-modal-title" className="admin-modal-name">New invite code</div>
            </div>

            <div className="admin-modal-section">
              <div className="admin-modal-label">Label</div>
              <input
                ref={firstFieldRef}
                type="text"
                className="invite-text-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Fall dispatcher cohort"
                maxLength={120}
              />
            </div>

            <div className="admin-modal-section">
              <div className="admin-modal-label">Prefix (optional)</div>
              <input
                type="text"
                className="invite-text-input mono"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="DISPATCH-2026-A"
                maxLength={24}
              />
            </div>

            <div className="admin-modal-section">
              <div className="admin-modal-label">Workspaces</div>
              <div className="admin-role-grid">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={'admin-role-option' + (roles.has(r.key) ? ' selected' : '')}
                    aria-pressed={roles.has(r.key)}
                    onClick={() => toggleRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="admin-modal-hint">
                The first workspace you pick is where students land when they sign up.
              </div>
            </div>

            <div className="admin-modal-section invite-fields-row">
              <div>
                <div className="admin-modal-label">Expires</div>
                <input
                  type="date"
                  className="invite-text-input"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div>
                <div className="admin-modal-label">Max uses</div>
                <input
                  type="number"
                  min="1"
                  className="invite-text-input"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {error && <div className="admin-modal-error">{error}</div>}

            <div className="admin-modal-actions">
              <button type="button" className="admin-modal-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="admin-modal-save" disabled={roles.size === 0 || saving}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}
