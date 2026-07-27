import axios from 'axios'
import { getCsrfToken, getUser } from './auth'
import { getApiUrl } from './api'

/**
 * Subidas multipart: en dev van por /api (proxy Vite → backend, same-origin,
 * evita CORS con archivos grandes). En producción, front y back están en
 * dominios distintos, así que se usa VITE_API_URL (misma resolución que api.js).
 */
export async function submitFormData(path, formData, { timeout = 300000 } = {}) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  if (!getUser()) {
    const err = new Error('Sesión no iniciada. Cierra sesión e inicia de nuevo.')
    err.response = { status: 401, data: { error: 'Sin sesión' } }
    throw err
  }

  try {
    const res = await axios.post(getApiUrl(cleanPath), formData, {
      timeout,
      withCredentials: true,
      headers: {
        'X-CSRF-Token': getCsrfToken(),
      },
    })
    return { data: res.data, status: res.status }
  } catch (err) {
    if (err.response) {
      throw err
    }
    const networkErr = new Error(
      err.code === 'ECONNABORTED'
        ? 'La subida tardó demasiado. Usa archivos más livianos (máx. 8 MB c/u).'
        : 'No se pudo enviar la subida. Reinicia npm run dev y uvicorn, luego vuelve a iniciar sesión.',
    )
    networkErr.response = null
    networkErr.code = err.code
    throw networkErr
  }
}
