import { Outlet, useLocation } from 'react-router-dom'
import './Layout.css'

function Layout() {
  const location = useLocation()

  const isLandingRoute = ['/', '/cursos', '/blog', '/nosotros', '/contacto', '/verificar'].includes(location.pathname)

  // En el panel y certificado no usamos este header/layout público (pantalla completa)
  if (location.pathname.startsWith('/panel') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/certificado/') ||
    location.pathname.startsWith('/consulta/') ||
    location.pathname === '/login' ||
    isLandingRoute) {
    return <Outlet />
  }

  return (
    <div className="layout">
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
