import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../data/roleRoutes'
import { ApiError } from '../api/client'
import truckBg from '../assets/truck-bg.png'
import './Login.css'
import './Pending.css'

export default function Pending() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState('')

  // If another tab (or an admin acting elsewhere) grants a role while this
  // tab is sitting on the pending screen, move on as soon as it shows up —
  // the visibilitychange refresh in AuthContext keeps `user` current.
  useEffect(() => {
    if (!user) return
    if (user.roles.length > 0) navigate(roleHomePath(user.activeRole), { replace: true })
    else if (user.isAdmin) navigate('/admin', { replace: true })
  }, [user, navigate])

  async function handleCheckAgain() {
    setNotice('')
    setChecking(true)
    try {
      const me = await refreshUser()
      if (me.roles.length > 0) {
        navigate(roleHomePath(me.activeRole))
      } else if (me.isAdmin) {
        navigate('/admin')
      } else {
        setNotice('No workspace assigned yet.')
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        setNotice('Cannot reach the server.')
      } else {
        setNotice('No workspace assigned yet.')
      }
    } finally {
      setChecking(false)
    }
  }

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div className="login-scene" style={{ '--login-bg-image': `url(${truckBg})` }}>
      <motion.div
        className="login-brand-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="brand-mark">DS</div>
        <div>
          <div className="login-brand-text">DispatchSim</div>
          <div className="login-brand-sub">Dispatch operations</div>
        </div>
      </motion.div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
      >
        <div className="login-card-title">Your account is ready</div>
        <div className="login-card-sub">
          An administrator will assign your workspace shortly. You will see it here once access is granted.
        </div>

        {user?.name && <div className="pending-user-name">{user.name}</div>}

        {notice && <div className="pending-notice">{notice}</div>}

        <button type="button" className="login-btn" onClick={handleCheckAgain} disabled={checking}>
          {checking ? 'Checking…' : 'Check again'}
        </button>

        <button type="button" className="pending-signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </motion.div>
    </div>
  )
}
