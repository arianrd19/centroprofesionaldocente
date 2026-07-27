import axios from 'axios'
import { getCsrfToken, removeToken } from './auth'

let baseURL = import.meta.env.VITE_API_URL || '/api'

if (baseURL.startsWith('http')) {
  baseURL = baseURL.replace(/\/$/, '')
  if (!baseURL.endsWith('/api')) {
    baseURL = `${baseURL}/api`
  }
}

export const getApiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path

  if (baseURL.startsWith('/')) {
    return `${baseURL}/${cleanPath}`
  }

  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  return `${base}/${cleanPath}`
}

const api = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL : `${baseURL}/`,
  withCredentials: true,
})

function setHeader(config, key, value) {
  if (config.headers?.set) {
    config.headers.set(key, value)
  } else {
    config.headers = config.headers || {}
    config.headers[key] = value
  }
}

function deleteHeader(config, key) {
  if (config.headers?.delete) {
    config.headers.delete(key)
  } else if (config.headers) {
    delete config.headers[key]
  }
}

api.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1)
    }

    const method = (config.method || 'get').toLowerCase()
    if (method !== 'get') {
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        setHeader(config, 'X-CSRF-Token', csrfToken)
      }
    }

    if (config.data instanceof FormData) {
      deleteHeader(config, 'Content-Type')
    }

    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      handleUnauthorized()
    }
    return Promise.reject(error)
  },
)

export function handleUnauthorized() {
  removeToken()
  window.location.href = '/login?sesion=1'
}

export default api
