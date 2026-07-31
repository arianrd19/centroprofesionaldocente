import { Navigate } from 'react-router-dom'
import { getUser, hasValidSession, removeToken } from '../../utils/auth'

/** Unica fuente de verdad para decidir si el usuario logueado es admin. */
export function isAdminUser(user) {
  return user?.role === 'admin' || (user?.rol || '').toLowerCase() === 'admin'
}

/** Gatea /admin/*: requiere sesion y rol admin; si no es admin, lo manda a /asesor. */
export function AdminRoute({ children }) {
  if (!hasValidSession()) {
    removeToken()
    return <Navigate to="/login?sesion=1" replace />
  }
  if (!isAdminUser(getUser())) {
    return <Navigate to="/asesor" replace />
  }
  return children
}

/** Gatea /asesor/*: requiere sesion; si es admin, lo manda a /admin. */
export function AsesorRoute({ children }) {
  if (!hasValidSession()) {
    removeToken()
    return <Navigate to="/login?sesion=1" replace />
  }
  if (isAdminUser(getUser())) {
    return <Navigate to="/admin" replace />
  }
  return children
}

/** Redirige la raiz del dashboard segun sesion/rol. */
export function RootRedirect() {
  if (!hasValidSession()) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={isAdminUser(getUser()) ? '/admin' : '/asesor'} replace />
}
