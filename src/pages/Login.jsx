import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../data/roleRoutes'
import { ApiError } from '../api/client'
import truckBg from '../assets/truck-bg.png'
import './Login.css'

function loginErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return 'Email or password is incorrect'
    if (err.code === 'RATE_LIMITED') return 'Too many attempts. Try again in a few minutes.'
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server. Is the API running?'
  }
  return 'Something went wrong. Please try again.'
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password, remember)
      navigate(roleHomePath(user.activeRole))
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
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

          {error && <div className="login-error">{error}</div>}

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

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
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
