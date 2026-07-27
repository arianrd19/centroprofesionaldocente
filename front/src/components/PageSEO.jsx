import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPageSEO } from '../landing/applyPageSEO.js'
import { pageIdFromPathname } from '../landing/seoConfig.js'

/** Actualiza meta tags, canonical y JSON-LD en cada cambio de ruta. */
export default function PageSEO() {
  const { pathname } = useLocation()

  useEffect(() => {
    applyPageSEO(pageIdFromPathname(pathname))
  }, [pathname])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
