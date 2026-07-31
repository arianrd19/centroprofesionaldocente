import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import api from '../utils/api'
import { getUser, removeToken } from '../utils/auth'
import AppShell from '../components/layout/AppShell'
import CrearCertificado from '../components/CrearCertificado'
import ListaCertificados from '../components/ListaCertificados'
import GestionClientes from '../components/GestionClientes'
import UnirPDFs from '../components/UnirPDFs'
import ReemplazarPDF from '../components/ReemplazarPDF'
import '../components/layout/AppShell.css'

function Panel() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const isUnirPDFs = location.pathname === '/panel/unir-pdfs'
  const isReemplazarPDF = location.pathname === '/panel/reemplazar-pdf'

  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      navigate('/login')
    } else {
      setUser(userData)
    }
  }, [navigate])

  if (!user) {
    return <div className="app-empty">Cargando...</div>
  }

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
    { to: '/panel/certificados', end: true, icon: '📋', label: 'Certificados' },
    { to: '/panel/crear', icon: '➕', label: 'Crear Certificado' },
    { to: '/panel/unir-pdfs', icon: '🔗', label: 'Unir PDFs' },
    { to: '/panel/reemplazar-pdf', icon: '📄', label: 'Reemplazar PDF' },
    { to: '/panel/clientes', icon: '👤', label: 'Gestión de Clientes' },
  ]

  if (user.role === 'admin') {
    navItems.push({ to: '/admin/dashboard', icon: '📊', label: 'Panel Asesores' })
  }

  const footerItems = [
    { to: '/verificar', icon: '🔍', label: 'Verificar Certificado' },
    { key: 'logout', icon: '🚪', label: 'Cerrar sesión', onClick: handleLogout },
  ]

  return (
    <AppShell
      user={user}
      logoTo="/panel/certificados"
      navItems={navItems}
      footerItems={footerItems}
      contentClassName={`app-page-card${isUnirPDFs || isReemplazarPDF ? ' app-page-card-muted' : ''}`}
    >
      <Routes>
        <Route index element={<Navigate to="certificados" replace />} />
        <Route path="certificados" element={<ListaCertificados />} />
        <Route path="crear" element={<CrearCertificado />} />
        <Route path="clientes" element={<GestionClientes />} />
        <Route path="unir-pdfs" element={<UnirPDFs />} />
        <Route path="reemplazar-pdf" element={<ReemplazarPDF />} />
      </Routes>
    </AppShell>
  )
}

export default Panel
