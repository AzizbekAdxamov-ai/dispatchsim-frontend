import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../data/roleRoutes'
import { ApiError } from '../api/client'
import { LOGIN_FEEDBACK, cooldownSeconds } from '../data/loginFeedback'
import truckBg from '../assets/truck-bg.webp'
import './Login.css'

function loginErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return LOGIN_FEEDBACK.invalid
    if (err.code === 'RATE_LIMITED') return LOGIN_FEEDBACK.limited
    if (err.code === 'NETWORK_ERROR') return LOGIN_FEEDBACK.network
  }
  return LOGIN_FEEDBACK.unknown
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)
  const inFlight = useRef(false)
  const cooldownUntil = useRef(0)
  const [remaining, setRemaining] = useState(0)
  const coolingDown = remaining > 0

  useEffect(() => {
    if (!coolingDown) return
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000)))
    }, 250)
    return () => clearInterval(timer)
  }, [coolingDown])

  async function handleSubmit(e) {
    e.preventDefault()
    // React state updates are deferred; the ref also blocks same-tick Enter/click.
    if (inFlight.current || Date.now() < cooldownUntil.current) return
    inFlight.current = true
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password, remember)
      navigate(roleHomePath(user.activeRole))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        const seconds = cooldownSeconds(err.details)
        cooldownUntil.current = Date.now() + seconds * 1000
        setRemaining(seconds)
      } else {
        setError(loginErrorMessage(err))
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
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
        <div className="login-card-title">Sign in</div>
        <div className="login-card-sub">Enter your details to access your account</div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {(remaining > 0 || error) && <div className="login-error" role="status" aria-live="polite">{remaining > 0 ? LOGIN_FEEDBACK.cooldown(remaining) : error}</div>}

          <div className="login-row-between">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              /> Remember me
            </label>
            <button type="button" className="login-forgot">Forgot password?</button>
          </div>

          <button type="submit" className="login-btn" disabled={submitting || remaining > 0}>
            {submitting ? LOGIN_FEEDBACK.signingIn : LOGIN_FEEDBACK.signIn}
          </button>
        </form>

        <div className="login-divider">or</div>

        <div className="login-signup-row">
          Don't have an account? <Link to="/register"><b>Sign up</b></Link>
        </div>
      </motion.div>
    </div>
  )
}
