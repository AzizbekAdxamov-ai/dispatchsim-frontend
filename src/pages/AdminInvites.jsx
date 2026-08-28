import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Copy, Check, CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { api, ApiError } from '../api/client'
import { roleLabel, sortRoles } from '../data/roleRoutes'
import InviteModal from '../components/admin/InviteModal'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './AdminUsers.css'
import './AdminInvites.css'

const PAGE_SIZE = 25

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
]

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

function loadErrorMessage(err) {
  if (err instanceof ApiError && err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  return 'Something went wrong. Please try again.'
}

function inviteLink(code) {
  return `${window.location.origin}/register?invite=${code}`
}

// `is_active` is the only mutable flag (see admin.routes.js — no DELETE),
// so "Active" here still needs to account for a code that's technically
// active but has expired or run out of uses; the server enforces this at
// redemption time regardless of what this label shows.
function inviteStatus(invite) {
  if (!invite.isActive) return { label: 'Inactive', cls: 'neutral' }
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return { label: 'Expired', cls: 'warn' }
  if (invite.maxUses != null && invite.usedCount >= invite.maxUses) return { label: 'Used up', cls: 'warn' }
  return { label: 'Active', cls: 'ontime' }
}

export default function AdminInvites() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [invites, setInvites] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const abortRef = useRef(null)

  function handleFilterChange(key) {
    setFilter(key)
    setPage(1)
  }

  const fetchInvites = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ filter, page: String(page), limit: String(PAGE_SIZE) })
      const result = await api.get(`/admin/invites?${params.toString()}`, { auth: true, signal: controller.signal })
      setInvites(result.invites)
      setMeta(result.meta)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setInvites([])
      setError(loadErrorMessage(err))
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    fetchInvites()
    return () => abortRef.current?.abort()
  }, [fetchInvites])

  function handleCreated() {
    setCreating(false)
    setNotice('Invite code created.')
    fetchInvites()
    setTimeout(() => setNotice(''), 6000)
  }

  async function handleToggleActive(invite) {
    setBusyId(invite.id)
    try {
      await api.patch(`/admin/invites/${invite.id}`, { isActive: !invite.isActive }, { auth: true })
      fetchInvites()
    } catch (err) {
      setError(loadErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleCopy(invite) {
    try {
      await navigator.clipboard.writeText(inviteLink(invite.code))
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId((id) => (id === invite.id ? null : id)), 1800)
    } catch {
      // Clipboard API unavailable/denied — the code is still visible in the table to copy by hand.
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Invite codes</div>
          <div className="page-sub">Links that open workspaces for new students</div>
        </div>
        <button type="button" className="admin-invite-new-btn" onClick={() => setCreating(true)}>
          <Plus size={14} weight="bold" />
          New invite code
        </button>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (filter === t.key ? ' active' : '')}
            onClick={() => handleFilterChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="admin-notice">
          <span>{notice}</span>
          <button type="button" className="admin-notice-close" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel"><div className="page-empty">Loading invite codes…</div></div>
      ) : error ? (
        <div className="panel"><div className="page-empty">{error}</div></div>
      ) : (
        <div className="panel load-board">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Code</th>
                <th>Workspaces</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {invites.map((invite) => {
                  const status = inviteStatus(invite)
                  return (
                    <tr className="row" key={invite.id}>
                      <td>{invite.label || '—'}</td>
                      <td>
                        <div className="admin-invite-code-cell">
                          <span className="mono">{invite.code}</span>
                          <button
                            type="button"
                            className="admin-invite-copy-btn"
                            onClick={() => handleCopy(invite)}
                            aria-label="Copy invite link"
                          >
                            {copiedId === invite.id ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="admin-role-badges">
                          {sortRoles(invite.roles).map((key) => (
                            <span key={key} className="badge neutral">
                              <span className="dot"></span>
                              {roleLabel(key)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="mono">
                        {invite.usedCount}{invite.maxUses != null ? ` / ${invite.maxUses}` : ''}
                      </td>
                      <td className="mono">{formatDate(invite.expiresAt)}</td>
                      <td>
                        <span className={'badge ' + status.cls}>
                          <span className="dot"></span>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-manage-btn"
                          onClick={() => handleToggleActive(invite)}
                          disabled={busyId === invite.id}
                        >
                          {invite.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </AnimatePresence>
              {invites.length === 0 && (
                <tr>
                  <td colSpan={7} className="page-empty">No invite codes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="admin-pager">
          <button
            type="button"
            className="admin-pager-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <CaretLeft size={13} /> Previous
          </button>
          <div className="admin-pager-status">Page {page} of {totalPages}</div>
          <button
            type="button"
            className="admin-pager-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <CaretRight size={13} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {creating && <InviteModal onClose={() => setCreating(false)} onCreated={handleCreated} />}
      </AnimatePresence>
    </>
  )
}
