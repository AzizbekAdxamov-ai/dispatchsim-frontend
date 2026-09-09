import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, X, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../data/roleRoutes'
import UserTable from '../components/admin/UserTable'
import AccessModal from '../components/admin/AccessModal'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './AdminUsers.css'

const PAGE_SIZE = 50

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting access' },
  { key: 'admins', label: 'Administrators' },
]

function loadErrorMessage(err) {
  if (err instanceof ApiError && err.code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  return 'Something went wrong. Please try again.'
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()

  const [filter, setFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pendingCount: 0 })
  const [tabCounts, setTabCounts] = useState({ all: null, admins: null })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [managingUser, setManagingUser] = useState(null)
  const [notice, setNotice] = useState('')

  // Bulk-assign selection. Only ever holds ids from the currently visible
  // page — cleared below whenever filter/search/page changes, so an admin
  // can never assign a workspace to a row they can no longer see.
  const [selected, setSelected] = useState(() => new Set())
  const [bulkRoles, setBulkRoles] = useState(() => new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState('')

  const abortRef = useRef(null)

  // Debounce the search box, and jump back to page 1 whenever it settles on a new value.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [searchInput])

  // ⚠️ Selection is scoped to the current filter/search/page. If it were not
  // cleared here, an admin could change the filter, tick more rows, and
  // "Assign to selected" would silently include rows they are no longer
  // looking at. This is the single most important guard in this file.
  useEffect(() => {
    setSelected(new Set())
  }, [filter, search, page])

  function handleFilterChange(key) {
    setFilter(key)
    setPage(1)
  }

  const fetchUsers = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ filter, page: String(page), limit: String(PAGE_SIZE) })
      if (search) params.set('search', search)
      const result = await api.get(`/admin/users?${params.toString()}`, { auth: true, signal: controller.signal })
      setUsers(result.users)
      setMeta(result.meta)
      setTabCounts((prev) => (filter === 'pending' ? prev : { ...prev, [filter]: result.meta.total }))
    } catch (err) {
      if (err?.name === 'AbortError') return
      setUsers([])
      setError(loadErrorMessage(err))
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [filter, search, page])

  useEffect(() => {
    fetchUsers()
    return () => abortRef.current?.abort()
  }, [fetchUsers])

  // Refresh the list when this tab becomes visible again, so access changes
  // made in another tab (or by another admin) show up without a manual
  // reload. abortRef already cancels any in-flight request on the next call.
  useEffect(() => {
    let last = Date.now()
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 30000) return
      last = Date.now()
      fetchUsers()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchUsers])

  function tabCount(key) {
    if (key === 'pending') return meta.pendingCount
    const value = tabCounts[key]
    return value == null ? '—' : value
  }

  function handleManage(user) {
    setManagingUser(user)
  }

  function handleSaved() {
    setManagingUser(null)
    setNotice('Access updated. The user sees the new workspace after their next page refresh.')
    fetchUsers()
    setTimeout(() => setNotice(''), 6000)
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return
    try {
      await api.del(`/admin/users/${user.id}`, { auth: true })
      setNotice(`${user.name} has been deleted.`)
      fetchUsers()
      setTimeout(() => setNotice(''), 6000)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Delete failed.'
      setNotice(msg)
      setTimeout(() => setNotice(''), 6000)
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (users.length > 0 && prev.size === users.length) return new Set()
      return new Set(users.map((u) => u.id))
    })
  }

  function toggleBulkRole(key) {
    setBulkRoles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setBulkRoles(new Set())
    setBulkError('')
  }

  async function handleBulkAssign() {
    if (selected.size === 0 || bulkRoles.size === 0 || bulkSaving) return
    setBulkSaving(true)
    setBulkError('')
    try {
      const body = { userIds: [...selected], mode: 'add', roles: [...bulkRoles] }
      const result = await api.post('/admin/users/bulk-roles', body, { auth: true })
      const { summary } = result
      if (summary.skipped > 0) {
        setNotice(
          `Assigned to ${summary.updated} of ${summary.requested} accounts. ${summary.skipped} could not be updated.`
        )
      } else {
        setNotice(`Workspace assigned to ${summary.updated} accounts.`)
      }
      setSelected(new Set())
      setBulkRoles(new Set())
      fetchUsers()
      setTimeout(() => setNotice(''), 6000)
    } catch (err) {
      setBulkError(loadErrorMessage(err))
    } finally {
      setBulkSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Users</div>
          <div className="page-sub">Accounts and access</div>
        </div>
      </div>

      <div className="page-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'page-tab' + (filter === t.key ? ' active' : '')}
            onClick={() => handleFilterChange(t.key)}
          >
            {t.label} <span className="page-tab-count">{tabCount(t.key)}</span>
          </button>
        ))}
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder="Name, email or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="page-toolbar-spacer" />
        <div className="page-result-count">{meta.total} users</div>
      </div>

      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <div className="admin-bulk-count">{selected.size} selected</div>
          <div className="admin-bulk-roles">
            {ROLES.map((r) => (
              <label key={r.key} className="admin-bulk-role-check">
                <input
                  type="checkbox"
                  checked={bulkRoles.has(r.key)}
                  onChange={() => toggleBulkRole(r.key)}
                />
                {r.label}
              </label>
            ))}
          </div>
          {bulkError && <div className="admin-bulk-error">{bulkError}</div>}
          <div className="admin-bulk-actions">
            <button type="button" className="admin-bulk-clear" onClick={clearSelection}>
              Clear
            </button>
            <button
              type="button"
              className="admin-bulk-assign"
              onClick={handleBulkAssign}
              disabled={bulkRoles.size === 0 || bulkSaving}
            >
              {bulkSaving ? 'Assigning…' : 'Assign to selected'}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="admin-notice">
          <span>{notice}</span>
          <button type="button" className="admin-notice-close" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel"><div className="page-empty">Loading users…</div></div>
      ) : error ? (
        <div className="panel"><div className="page-empty">{error}</div></div>
      ) : (
        <UserTable
          users={users}
          onManage={handleManage}
          onDelete={handleDelete}
          selectedIds={selected}
          onToggle={toggleSelected}
          onToggleAll={toggleSelectAll}
        />
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
        {managingUser && (
          <AccessModal
            key={managingUser.id}
            user={managingUser}
            currentUser={currentUser}
            onClose={() => setManagingUser(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </>
  )
}
