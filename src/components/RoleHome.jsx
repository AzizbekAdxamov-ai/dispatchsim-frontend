import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../data/roleRoutes'
import Dashboard from '../pages/Dashboard'

export default function RoleHome() {
  const { user } = useAuth()

  if (user?.roles?.length === 0 && user?.isAdmin) return <Navigate to="/admin" replace />
  if (user?.roles?.length === 0) return <Navigate to="/pending" replace />

  const path = roleHomePath(user.activeRole)
  if (path !== '/') return <Navigate to={path} replace />
  return <Dashboard />
}
