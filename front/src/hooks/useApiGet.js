import { useEffect, useRef, useState } from 'react'
import { fetchApiGet, isAbortError, STABLE_EMPTY_DEPS } from '../utils/fetchApiGet'

/**
 * Carga GET al montar o cuando cambian las dependencias.
 * No pasar `[]` inline como deps (crea referencia nueva cada render).
 */
export function useApiGet(url, params = {}, deps = STABLE_EMPTY_DEPS) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError(null)

    fetchApiGet(url, paramsRef.current, controller.signal)
      .then((res) => {
        if (active) setData(res.data)
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return
        setError(err)
        console.error(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, deps)

  return { data, loading, error, setData }
}
