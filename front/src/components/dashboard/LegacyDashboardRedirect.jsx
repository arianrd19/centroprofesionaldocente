import { Navigate, useLocation, useParams } from 'react-router-dom'
import { getUser, hasValidSession } from '../../utils/auth'
import { isAdminUser } from './DashboardGuards'

/** Mapea el segmento viejo de /dashboard/* o /dashboard-admin/* al nuevo bajo /admin o /asesor. */
const SEGMENT_MAP = {
  '': '',
  admin: 'gestion-usuarios',
  ventas: 'ventas',
  'mi-panel': 'ventas',
  cobranza: 'cobranza',
  'consulta-ventas': 'consulta-ventas',
  'subir-ventas': 'subir-ventas',
  'subir-ventas-serums': 'subir-ventas-serums',
  'subir-certificados': 'subir-certificados',
  menciones: 'menciones',
}

/** Redirige URLs viejas (/dashboard/..., /dashboard-admin) a /admin/... o /asesor/... segun el rol. */
function LegacyDashboardRedirect() {
  const { '*': rest } = useParams()
  const location = useLocation()

  if (!hasValidSession()) {
    return <Navigate to="/login?sesion=1" replace />
  }

  const prefix = isAdminUser(getUser()) ? '/admin' : '/asesor'
  const segment = (rest || '').split('/')[0]
  const mapped = SEGMENT_MAP[segment] ?? ''
  const target = mapped ? `${prefix}/${mapped}` : prefix

  return <Navigate to={`${target}${location.search}`} replace />
}

export default LegacyDashboardRedirect
