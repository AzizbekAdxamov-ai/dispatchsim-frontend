import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, Check } from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import { roleLabel, roleHomePath, sortRoles } from '../../data/roleRoutes'
import './WorkspaceSwitcher.css'

// Lets a student with more than one open workspace switch which one is
// active. Hidden entirely for a single-role student — there is nothing to
// switch between, so no control is shown at all.
export default function WorkspaceSwitcher() {
  const { user, setActiveRole } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user || user.roles.length < 2) return null

  const roles = sortRoles(user.roles)

  async function handleSelect(key) {
    setOpen(false)
    if (key === user.activeRole) return

    setSwitching(true)
    try {
      await setActiveRole(key)
      // Each workspace has its own shell — updating state alone does not
      // move the student into it, so the route change is required here.
      navigate(roleHomePath(key))
    } catch (err) {
      // setActiveRole re-syncs the user on ROLE_NOT_GRANTED and then
      // RETHROWS, and every other failure — a network drop, a 500 —
      // arrived here too. Swallowing them meant the menu closed, the
      // label did not change, and nothing on screen said why.
      setSwitchError(
        err instanceof ApiError && err.code === 'ROLE_NOT_GRANTED'
          ? 'That workspace is no longer granted to you.'
          : 'Could not switch workspace. Try again.',
      )
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        type="button"
        className="workspace-switcher-trigger"
        onClick={() => { setSwitchError(''); setOpen((v) => !v) }}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={switching}
      >
        <span className="workspace-switcher-label">{roleLabel(user.activeRole)}</span>
        <CaretDown size={12} weight="bold" className="workspace-switcher-caret" />
      </button>

      {switchError && (
        <div className="workspace-switcher-error" role="alert">{switchError}</div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="workspace-switcher-menu"
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {roles.map((key) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                className="workspace-switcher-item"
                onClick={() => handleSelect(key)}
              >
                <span>{roleLabel(key)}</span>
                {key === user.activeRole && (
                  <Check size={14} weight="bold" className="workspace-switcher-check" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
