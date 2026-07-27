import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Manda al usuario al otro dominio (landing <-> dashboard) preservando la ruta.
// Usa window.location porque React Router no puede navegar entre orígenes distintos.
function ExternalRedirect({ baseUrl }) {
  const location = useLocation()

  useEffect(() => {
    window.location.replace(`${baseUrl}${location.pathname}${location.search}`)
  }, [baseUrl, location.pathname, location.search])

  return null
}

export default ExternalRedirect
