import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from './routeGate'
import Dashboard from '../pages/Dashboard'

export default function RoleHome() {
  const { user } = useAuth()

  const path = homeFor(user)
  if (path !== '/') return <Navigate to={path} replace />
  return <Dashboard />
}
