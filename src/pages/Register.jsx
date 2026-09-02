import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../data/roleRoutes'
import { ApiError } from '../api/client'
import truckBg from '../assets/truck-bg.png'
import './Login.css'

function registerErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === 'EMAIL_TAKEN') return 'This email is already registered'
    if (err.code === 'VALIDATION_ERROR') return 'Password must be at least 8 characters'
    if (err.code === 'INVITE_INVALID') {
      return 'This invite link is no longer valid — ask your instructor for a new one, or continue without it.'
    }
    if (err.code === 'RATE_LIMITED') return 'Too many attempts. Try again in a few minutes.'
    if (err.code === 'NETWORK_ERROR') return 'Cannot reach the server. Is the API running?'
  }
  return 'Something went wrong. Please try again.'
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [invite, setInvite] = useState(() => (searchParams.get('invite') || '').trim().toUpperCase())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await register({ name, company, email, password, invite: invite || undefined })
      navigate(roleHomePath(user.activeRole))
    } catch (err) {
      setError(registerErrorMessage(err))
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
        className="login-card wide"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
      >
        <div className="login-card-title">Create account</div>
        <div className="login-card-sub">Set up a workspace for your team</div>

        {invite && (
          <div className="login-field">
            <label className="login-field-label" htmlFor="invite-code">Invite code</label>
            <input
              id="invite-code"
              className="mono"
              value={invite}
              readOnly
            />
            <div className="login-signup-row" style={{ textAlign: 'left', marginTop: 6 }}>
              <button type="button" className="login-forgot" onClick={() => setInvite('')}>
                Continue without an invite code
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field-label" htmlFor="name">Full name</label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="login-field">
            <label className="login-field-label" htmlFor="company">Company / team name</label>
            <input
              id="company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="login-divider">or</div>

        <div className="login-signup-row">
          Already have an account? <Link to="/login"><b>Sign in</b></Link>
        </div>
      </motion.div>
    </div>
  )
}
