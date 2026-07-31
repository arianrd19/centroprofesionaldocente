import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { getUser, hasValidSession, removeToken } from '../../utils/auth'
import api from '../../utils/api'
import AppShell from '../layout/AppShell'
import '../layout/AppShell.css'

function DashboardLayout() {
  const user = getUser()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || (user?.rol || '').toLowerCase() === 'admin'

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (_) {
      /* ignore */
    }
    removeToken()
    navigate('/login')
  }

  const navItems = [
    isAdmin
      ? { to: '/dashboard-admin', end: true, icon: '📈', label: 'Dashboard Admin' }
      : { to: '/dashboard', end: true, icon: '🏠', label: 'Inicio' },
    { to: '/dashboard/mi-panel', icon: '📊', label: 'Últimas ventas' },
    ...(isAdmin ? [] : [
      { to: '/dashboard/cobranza', icon: '💲', label: 'Cobranza' },
      { to: '/dashboard/subir-ventas', icon: '📤', label: 'Subir ventas' },
      { to: '/dashboard/subir-ventas-serums', icon: '🧪', label: 'Subir ventas SERUMS' },
      { to: '/dashboard/subir-certificados', icon: '📜', label: 'Subir certificados' },
    ]),
    { to: '/dashboard/ventas', icon: '💰', label: 'Consulta ventas' },
    { to: '/dashboard/menciones', icon: '🎓', label: 'Menciones' },
  ]

  if (isAdmin) {
    navItems.push(
      { to: '/dashboard/admin', icon: '🛡️', label: 'Gestionar usuarios' },
      { to: '/panel/certificados', icon: '📋', label: 'Certificados QR' },
    )
  }

  const footerItems = [
    { key: 'logout', icon: '🚪', label: 'Cerrar sesión', onClick: handleLogout },
  ]

  return (
    <AppShell user={user} logoTo={isAdmin ? '/dashboard-admin' : '/dashboard'} navItems={navItems} footerItems={footerItems}>
      <Outlet />
    </AppShell>
  )
}

export function DashboardProtectedRoute({ children }) {
  if (!hasValidSession()) {
    removeToken()
    return <Navigate to="/login?sesion=1" replace />
  }
  return children
}

export default DashboardLayout
