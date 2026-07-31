import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PageSEO from './components/PageSEO'
import Landing from './pages/Landing'
import Verificar from './pages/Verificar'
import Certificado from './pages/Certificado'
import Login from './pages/Login'
import Panel from './pages/Panel'
import PdfFullView from './pages/PdfFullView'
import ProtectedRoute from './components/ProtectedRoute'
import ExternalRedirect from './components/ExternalRedirect'
import DashboardLayout from './components/dashboard/DashboardLayout'
import { AdminRoute, AsesorRoute, RootRedirect } from './components/dashboard/DashboardGuards'
import LegacyDashboardRedirect from './components/dashboard/LegacyDashboardRedirect'
import DashboardHome from './pages/dashboard/DashboardHome'
import DashboardAdminHome from './pages/dashboard/DashboardAdminHome'
import MiDashboard from './pages/dashboard/MiDashboard'
import Cobranza from './pages/dashboard/Cobranza'
import VentasConsulta from './pages/dashboard/VentasConsulta'
import Menciones from './pages/dashboard/Menciones'
import DashboardAdmin from './pages/dashboard/DashboardAdmin'
import SubirVentas from './pages/dashboard/SubirVentas'
import SubirVentasSerums from './pages/dashboard/SubirVentasSerums'
import SubirCertificados from './pages/dashboard/SubirCertificados'
import { isDashboardHost, isLocalDevHost, DASHBOARD_URL, LANDING_URL } from './landing/paths'
import './components/layout/AppShell.css'

// Rutas del panel/dashboard — solo viven en dashboard.<dominio> (o en local dev).
// Separadas por rol: /admin/* (estadisticas + gestion de usuarios) y /asesor/*
// (herramientas del dia a dia de un asesor/operador) para que quede claro donde
// vive cada modulo en vez de que todo cuelgue de /dashboard.
function DashboardRoutes() {
  return (
    <>
      <Route path="login" element={<Login />} />
      <Route
        path="panel/*"
        element={
          <ProtectedRoute>
            <Panel />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/*"
        element={
          <AdminRoute>
            <DashboardLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardAdminHome />} />
        <Route path="gestion-usuarios" element={<DashboardAdmin />} />
        <Route path="ventas" element={<MiDashboard />} />
        <Route path="consulta-ventas" element={<VentasConsulta />} />
        <Route path="menciones" element={<Menciones />} />
      </Route>
      <Route
        path="asesor/*"
        element={
          <AsesorRoute>
            <DashboardLayout />
          </AsesorRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="ventas" element={<MiDashboard />} />
        <Route path="cobranza" element={<Cobranza />} />
        <Route path="subir-ventas" element={<SubirVentas />} />
        <Route path="subir-ventas-serums" element={<SubirVentasSerums />} />
        <Route path="subir-certificados" element={<SubirCertificados />} />
        <Route path="consulta-ventas" element={<VentasConsulta />} />
        <Route path="menciones" element={<Menciones />} />
      </Route>
      {/* URLs viejas (/dashboard/..., /dashboard-admin): redirigen a /admin o /asesor segun el rol */}
      <Route path="dashboard/*" element={<LegacyDashboardRedirect />} />
      <Route path="dashboard-admin/*" element={<LegacyDashboardRedirect />} />
    </>
  )
}

// Rutas del sitio público — solo viven en el dominio principal (o en local dev)
function LandingRoutes() {
  return (
    <>
      <Route index element={<Landing page="inicio" />} />
      <Route path="cursos" element={<Landing page="cursos" />} />
      <Route path="blog" element={<Landing page="blog" />} />
      <Route path="nosotros" element={<Landing page="nosotros" />} />
      <Route path="contacto" element={<Landing page="contacto" />} />
      <Route path="verificar" element={<Verificar />} />
      <Route path="certificado/:codigo" element={<Certificado />} />
      <Route path="consulta/:codigo" element={<Certificado />} />
      <Route path="pdf/:codigo" element={<PdfFullView />} />
    </>
  )
}

function App() {
  const onLocalDev = isLocalDevHost()
  const onDashboardHost = isDashboardHost()

  return (
    <>
      <PageSEO />
      <Routes>
        <Route path="/" element={<Layout />}>
          {onLocalDev && (
            <>
              {LandingRoutes()}
              {DashboardRoutes()}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {!onLocalDev && onDashboardHost && (
            <>
              <Route index element={<RootRedirect />} />
              {DashboardRoutes()}
              <Route path="cursos" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="blog" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="nosotros" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="contacto" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="verificar" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="certificado/:codigo" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="consulta/:codigo" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="pdf/:codigo" element={<ExternalRedirect baseUrl={LANDING_URL} />} />
              <Route path="*" element={<RootRedirect />} />
            </>
          )}

          {!onLocalDev && !onDashboardHost && (
            <>
              {LandingRoutes()}
              <Route path="login" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="panel/*" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="admin/*" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="asesor/*" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="dashboard/*" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="dashboard-admin/*" element={<ExternalRedirect baseUrl={DASHBOARD_URL} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </>
  )
}

export default App
