import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import { roleLabel, roleHomePath, sortRoles } from '../../data/roleRoutes'
import './WorkspaceSwitcher.css'

// Words this control speaks. Props, so a page can reword them.
export const WORKSPACE_COPY = {
  label: 'Workspaces',
  notGranted: 'That workspace is no longer granted to you.',
  failed: 'Could not switch workspace. Try again.',
}

// Lets a student with more than one open workspace switch which one is
// active. It lives on the Settings pages now, as a list of buttons: the
// popover that sat in the top bar cost the bar a fixed slot on every page
// for something done a few times a day at most. Hidden entirely for a
// single-role student -- there is nothing to switch between.
export default function WorkspaceSwitcher({ copy = WORKSPACE_COPY }) {
  const { user, setActiveRole } = useAuth()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')

  if (!user || user.roles.length < 2) return null

  const roles = sortRoles(user.roles)

  async function handleSelect(key) {
    if (key === user.activeRole) return
    setSwitchError('')
    setSwitching(true)
    try {
      await setActiveRole(key)
      // Each workspace has its own shell -- updating state alone does not
      // move the student into it, so the route change is required here.
      navigate(roleHomePath(key))
    } catch (err) {
      // setActiveRole re-syncs the user on ROLE_NOT_GRANTED and then
      // RETHROWS, and every other failure -- a network drop, a 500 --
      // arrives here too. Swallowing them meant nothing on screen said why.
      setSwitchError(err instanceof ApiError && err.code === 'ROLE_NOT_GRANTED' ? copy.notGranted : copy.failed)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="workspace-switcher" role="group" aria-label={copy.label}>
      {roles.map((key) => (
        <button
          key={key}
          type="button"
          className="workspace-switcher-item"
          aria-pressed={key === user.activeRole}
          disabled={switching}
          onClick={() => handleSelect(key)}
        >
          {roleLabel(key)}
        </button>
      ))}
      {switchError && (
        <div className="workspace-switcher-error" role="alert">{switchError}</div>
      )}
    </div>
  )
}
