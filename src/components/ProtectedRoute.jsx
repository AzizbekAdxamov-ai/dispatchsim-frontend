import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// `allow` is a UX guard only, not a security boundary — the corresponding
// API endpoints must enforce the same restriction server-side once they exist.
export default function ProtectedRoute({ children, requireAdmin, allow }) {
  const { user, status } = useAuth()

  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (requireAdmin && !user?.isAdmin) return <Navigate to="/" replace />
  if (allow && !allow.some((r) => user?.roles?.includes(r))) return <Navigate to="/" replace />

  return children
}
