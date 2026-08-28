import { createContext, useContext, useEffect, useState } from 'react'
import { api, ApiError, getToken, setToken, clearToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

const LEGACY_USER_KEY = 'dispatchsim.user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_USER_KEY)
    } catch {
      // ignore storage failures
    }

    const token = getToken()
    if (!token) {
      setStatus('anonymous')
      return
    }

    api
      .get('/auth/me', { auth: true })
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch((err) => {
        if (
          err instanceof ApiError &&
          (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED' || err.code === 'USER_NOT_FOUND')
        ) {
          clearToken()
        }
        setUser(null)
        setStatus('anonymous')
      })
  }, [])

  // Central 401 handling (client.js) signs this tab out the moment any
  // authenticated request comes back unauthorized, no matter which
  // component made the request.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('anonymous')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Refresh the current user whenever this tab becomes visible again, so an
  // admin granting a role (or revoking one) in another tab shows up here
  // without a manual refresh. `visibilitychange`, not `focus` — `focus` also
  // fires when DevTools is opened/closed in this tab.
  useEffect(() => {
    if (status !== 'authenticated') return
    let last = Date.now()
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 30000) return
      last = Date.now()
      refreshUser().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [status])

  async function login(email, password, remember = true) {
    const res = await api.post('/auth/login', { email, password })
    setToken(res.token, { remember })
    setUser(res.user)
    setStatus('authenticated')
    return res.user
  }

  async function register({ name, company, email, password, invite }) {
    const res = await api.post('/auth/register', { name, company, email, password, invite })
    setToken(res.token)
    setUser(res.user)
    setStatus('authenticated')
    return res.user
  }

  async function setActiveRole(role) {
    try {
      const updated = await api.patch('/auth/active-role', { activeRole: role }, { auth: true })
      setUser(updated)
      return updated
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ROLE_NOT_GRANTED') {
        await refreshUser()
      }
      throw err
    }
  }

  function logout() {
    clearToken()
    try {
      localStorage.removeItem(LEGACY_USER_KEY)
    } catch {
      // ignore storage failures
    }
    setUser(null)
    setStatus('anonymous')
  }

  async function refreshUser() {
    const me = await api.get('/auth/me', { auth: true })
    setUser(me)
    return me
  }

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, refreshUser, setActiveRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
