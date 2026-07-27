import axios from 'axios'
import { getCsrfToken, getUser } from './auth'

/**
 * Subidas multipart SIEMPRE por /api (proxy Vite → backend).
 * Same-origin: el navegador puede enviar archivos grandes sin CORS.
 * Llamar directo a :8000 provoca OPTIONS 200 pero el POST nunca llega.
 */
export async function submitFormData(path, formData, { timeout = 300000 } = {}) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  if (!getUser()) {
    const err = new Error('Sesión no iniciada. Cierra sesión e inicia de nuevo.')
    err.response = { status: 401, data: { error: 'Sin sesión' } }
    throw err
  }

  try {
    const res = await axios.post(`/api/${cleanPath}`, formData, {
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
