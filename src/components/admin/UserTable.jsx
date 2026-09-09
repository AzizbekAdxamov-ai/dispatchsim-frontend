import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { roleLabel, sortRoles } from '../../data/roleRoutes'
import '../dashboard/Panel.css'
import '../dashboard/LoadBoard.css'

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

export default function UserTable({ users, onManage, onDelete, selectedIds, onToggle, onToggleAll }) {
  const headerCheckboxRef = useRef(null)

  const selectedCount = users.reduce((n, u) => (selectedIds.has(u.id) ? n + 1 : n), 0)
  const allSelected = users.length > 0 && selectedCount === users.length
  const someSelected = selectedCount > 0 && !allSelected

  // Native indeterminate has no prop equivalent — it can only be set
  // imperatively on the DOM node.
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  return (
    <div className="panel load-board">
      <table>
        <thead>
          <tr>
            <th className="admin-checkbox-col">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                disabled={users.length === 0}
                aria-label="Select all users on this page"
              />
            </th>
            <th>Name</th>
            <th>Company</th>
            <th>Workspaces</th>
            <th>Access</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {users.map((user) => (
              <motion.tr
                className="row"
                key={user.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <td className="admin-checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => onToggle(user.id)}
                    aria-label={`Select ${user.name}`}
                  />
                </td>
                <td>
                  <div>{user.name}</div>
                  <div className="mono admin-user-email">{user.email}</div>
                </td>
                <td>{user.company ?? '—'}</td>
                <td>
                  {user.roles.length === 0 ? (
                    <span className="badge warn">
                      <span className="dot"></span>
                      Awaiting access
                    </span>
                  ) : (
                    <div className="admin-role-badges">
                      {sortRoles(user.roles).map((key) => (
                        <span key={key} className={'badge ' + (key === user.activeRole ? 'done' : 'neutral')}>
                          <span className="dot"></span>
                          {roleLabel(key)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {user.isAdmin ? (
                    <span className="badge done">
                      <span className="dot"></span>
                      Administrator
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mono">{formatDate(user.createdAt)}</td>
                <td>
                  <button type="button" className="admin-manage-btn" onClick={() => onManage(user)}>
                    Manage
                  </button>
                  <button type="button" className="admin-manage-btn" style={{ marginLeft: 6, color: 'var(--danger, #ef4444)' }} onClick={() => onDelete(user)}>
                    Delete
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="page-empty">No users match this filter.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
