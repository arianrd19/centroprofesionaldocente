import { Navigate } from 'react-router-dom'
import { getUser } from '../utils/auth'

const CERT_PANEL_ROLES = ['admin']

function ProtectedRoute({ children }) {
  const user = getUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!CERT_PANEL_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
