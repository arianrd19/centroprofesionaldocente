import { Navigate } from 'react-router-dom'
import { getUser } from '../../utils/auth'
import DashboardHome from './DashboardHome'

function DashboardIndex() {
  const user = getUser()
  const isAdmin = user?.role === 'admin' || (user?.rol || '').toLowerCase() === 'admin'
  if (isAdmin) return <Navigate to="/dashboard-admin" replace />
  return <DashboardHome />
}

export default DashboardIndex
