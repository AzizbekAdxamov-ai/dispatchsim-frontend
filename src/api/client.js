const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const TOKEN_KEY = 'dispatchsim.token'

function safeGet(store, key) {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function safeSet(store, key, value) {
  try {
    store.setItem(key, value)
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

function safeRemove(store, key) {
  try {
    store.removeItem(key)
  } catch {
    // ignore storage failures
  }
}

// Each tab keeps its own token in sessionStorage, so one tab can be signed in
// as an admin while another is signed in as a student without either
// clobbering the other's login. A brand-new tab still starts out signed in
// by adopting whatever token localStorage last saw (the "remember me" seed) —
// this runs once per tab, at module load, never inside getToken(). Doing it
// lazily would let a tab that signed out later adopt another tab's newer
// token out from under it.
let adopted = false
function adoptSeed() {
  if (adopted) return
  adopted = true
  if (safeGet(sessionStorage, TOKEN_KEY)) return
  const seed = safeGet(localStorage, TOKEN_KEY)
  if (seed) safeSet(sessionStorage, TOKEN_KEY, seed)
}
adoptSeed()

export function getToken() {
  return safeGet(sessionStorage, TOKEN_KEY)
}

export function setToken(token, { remember = true } = {}) {
  safeSet(sessionStorage, TOKEN_KEY, token)
  // Signing in without "remember me" must also drop any seed left behind by an
  // earlier remembered session — otherwise a later new tab would adopt that
  // stale token and silently open as the previous account.
  if (remember) safeSet(localStorage, TOKEN_KEY, token)
  else safeRemove(localStorage, TOKEN_KEY)
}

export function clearToken() {
  safeRemove(sessionStorage, TOKEN_KEY)
  safeRemove(localStorage, TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server', 0)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const code = data?.error?.code ?? 'INTERNAL_ERROR'
    const message = data?.error?.message ?? 'Something went wrong. Please try again.'

    // Only an authenticated request's own 401 can mean "this session is no
    // longer valid". Without the `auth` guard, a wrong password on the login
    // form (also a 401, code INVALID_CREDENTIALS) would trip this and sign
    // out whatever session is already active in the tab.
    if (auth && res.status === 401 && (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED')) {
      clearToken()
      onUnauthorized?.()
    }

    throw new ApiError(code, message, res.status)
  }

  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
}
