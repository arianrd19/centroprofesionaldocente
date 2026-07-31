import { Outlet, useNavigate } from 'react-router-dom'
import { getUser, removeToken } from '../../utils/auth'
import api from '../../utils/api'
import AppShell from '../layout/AppShell'
import { isAdminUser } from './DashboardGuards'
import '../layout/AppShell.css'

function DashboardLayout() {
  const user = getUser()
  const navigate = useNavigate()
  const isAdmin = isAdminUser(user)
  const prefix = isAdmin ? '/admin' : '/asesor'
  const homeTo = isAdmin ? '/admin/dashboard' : prefix

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
      ? { to: homeTo, end: true, icon: '📈', label: 'Dashboard Admin' }
      : { to: homeTo, end: true, icon: '🏠', label: 'Inicio' },
    { to: `${prefix}/ventas`, icon: '📊', label: isAdmin ? 'Listado de ventas' : 'Últimas ventas' },
    ...(isAdmin ? [] : [
      { to: `${prefix}/cobranza`, icon: '💲', label: 'Cobranza' },
      { to: `${prefix}/subir-ventas`, icon: '📤', label: 'Subir ventas' },
      { to: `${prefix}/subir-ventas-serums`, icon: '🧪', label: 'Subir ventas SERUMS' },
      { to: `${prefix}/subir-certificados`, icon: '📜', label: 'Subir certificados' },
    ]),
    { to: `${prefix}/consulta-ventas`, icon: '💰', label: 'Consulta ventas' },
    { to: `${prefix}/menciones`, icon: '🎓', label: 'Menciones' },
  ]

  if (isAdmin) {
    navItems.push(
      { to: '/admin/gestion-usuarios', icon: '🛡️', label: 'Gestionar usuarios' },
      { to: '/panel/certificados', icon: '📋', label: 'Certificados QR' },
    )
  }

  const footerItems = [
    { key: 'logout', icon: '🚪', label: 'Cerrar sesión', onClick: handleLogout },
  ]

  return (
    <AppShell user={user} logoTo={homeTo} navItems={navItems} footerItems={footerItems}>
      <Outlet />
    </AppShell>
  )
}

export default DashboardLayout
