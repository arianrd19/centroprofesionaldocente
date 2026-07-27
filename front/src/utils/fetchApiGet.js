import api from './api'

const STABLE_EMPTY_DEPS = []

const inflightGets = new Map()

export function buildGetKey(url, params = {}) {
  const cleanUrl = (url || '').replace(/^\//, '')
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
  return qs ? `${cleanUrl}?${qs}` : cleanUrl
}

/**
 * GET con deduplicación opcional (solo sin AbortSignal).
 * Con signal siempre lanza petición nueva para no reutilizar una cancelada.
 */
export function fetchApiGet(url, params = {}, signal) {
  if (signal) {
    return api.get(url, { params, signal })
  }

  const key = buildGetKey(url, params)
  if (inflightGets.has(key)) {
    return inflightGets.get(key)
  }

  const promise = api.get(url, { params }).finally(() => {
    if (inflightGets.get(key) === promise) {
      inflightGets.delete(key)
    }
  })

  inflightGets.set(key, promise)
  return promise
}

export function isAbortError(err) {
  return (
    err?.code === 'ERR_CANCELED'
    || err?.name === 'AbortError'
    || err?.name === 'CanceledError'
  )
}

export { STABLE_EMPTY_DEPS }
