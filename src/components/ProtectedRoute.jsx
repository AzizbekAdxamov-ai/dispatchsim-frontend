import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeRedirect } from './routeGate'

// `allow` is a UX guard only, not a security boundary — the corresponding
// API endpoints must enforce the same restriction server-side once they exist.
export default function ProtectedRoute({ children, requireAdmin, requireMentor, allow }) {
  const { user, status } = useAuth()
  const to = routeRedirect({ status, user, requireAdmin, requireMentor, allow })

  if (to === 'wait') return null
  if (to) return <Navigate to={to} replace />
  return children
}
