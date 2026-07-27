export const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard.centroprofesionaldocente.com'
export const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://centroprofesionaldocente.com'

function hostnameOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const DASHBOARD_HOSTNAME = hostnameOf(DASHBOARD_URL)

// En local (npm run dev) todo vive en el mismo puerto: no hay subdominio real
// que distinguir, así que las dos webs se muestran juntas como siempre.
export function isLocalDevHost(hostname = window.location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

// true solo en producción cuando se sirve el build desde dashboard.<dominio>
export function isDashboardHost(hostname = window.location.hostname) {
  if (isLocalDevHost(hostname)) return false
  return hostname === DASHBOARD_HOSTNAME
}

export const LANDING_PAGES = ['inicio', 'cursos', 'blog', 'nosotros', 'contacto']

export function landingPath(id) {
  if (id === 'inicio') return '/'
  if (id === 'verificar') return '/verificar'
  return `/${id}`
}

export function pageFromPathname(pathname) {
  const segment = pathname.replace(/^\//, '').split('/')[0]
  if (!segment) return 'inicio'
  return LANDING_PAGES.includes(segment) ? segment : 'inicio'
}

export const LEGACY_HASH_PAGES = [...LANDING_PAGES, 'verificar']
