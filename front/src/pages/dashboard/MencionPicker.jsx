import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApiGet, isAbortError } from '../../utils/fetchApiGet'

function MencionPicker({ value, onChange, especialidad = '', error, required }) {
  const wrapRef = useRef(null)
  const requestIdRef = useRef(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [listError, setListError] = useState('')

  const fetchMenciones = useCallback((q, signal) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setListError('')

    return fetchApiGet(
      '/dashboard/menciones',
      {
        q: q.trim(),
        especialidad: especialidad || '',
        page: 1,
        per_page: 10,
        q_nro_mencion_only: true,
      },
      signal,
    )
      .then((res) => {
        if (requestId !== requestIdRef.current) return
        setResults(res.data?.rows || [])
      })
      .catch((err) => {
        if (isAbortError(err) || requestId !== requestIdRef.current) return
        setListError('No se pudieron cargar las menciones.')
        setResults([])
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [especialidad])

  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }
    setSelected((prev) => (prev?.mencion === value ? prev : {
      nro: '',
      mencion: value,
      especialidad: '',
      p_certificado: '',
      horas: '',
    }))
  }, [value])

  useEffect(() => {
    if (!open || !especialidad) {
      if (!especialidad) {
        setResults([])
      }
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchMenciones(query, controller.signal)
    }, query ? 280 : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open, fetchMenciones, especialidad])

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const handleSelect = (row) => {
    setSelected(row)
    onChange(row.mencion || '')
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    setSelected(null)
    onChange('')
    setQuery('')
    setOpen(true)
  }

  return (
    <div className="venta-form__field venta-form__field--full venta-form__mencion-picker" ref={wrapRef}>
      <label className="venta-form__label">
        Menciones
        {required && <span> *</span>}
      </label>

      {selected?.mencion ? (
        <div className="venta-form__mencion-selected">
          <div className="venta-form__mencion-selected-main">
            {selected.nro && (
              <span className="venta-form__mencion-badge">NRO {selected.nro}</span>
            )}
            <p className="venta-form__mencion-selected-title">{selected.mencion}</p>
            <p className="venta-form__mencion-selected-meta">
              {[selected.especialidad, selected.p_certificado, selected.horas ? `${selected.horas} H` : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button type="button" className="venta-form__file-link" onClick={handleClear}>
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="venta-form__mencion-search">
            <input
              type="search"
              className="venta-form__input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder={especialidad ? 'Buscar por NRO o mención...' : 'Primero selecciona la especialidad arriba'}
              autoComplete="off"
              enterKeyHint="search"
              inputMode="search"
              disabled={!especialidad}
            />
            {especialidad ? (
              <span className="venta-form__mencion-filter">
                Filtrando: {especialidad}
              </span>
            ) : (
              <span className="venta-form__hint">Selecciona la especialidad del formulario para buscar menciones.</span>
            )}
          </div>

          {open && (
            <div className="venta-form__mencion-panel" role="listbox" aria-label="Resultados de menciones">
              <div className="venta-form__mencion-panel-head">
                {query ? 'Resultados de búsqueda' : 'Menciones más recientes'}
              </div>

              {!especialidad && (
                <p className="venta-form__mencion-empty">Elige una especialidad para ver las menciones disponibles.</p>
              )}
              {especialidad && loading && <p className="venta-form__mencion-empty">Buscando...</p>}
              {especialidad && !loading && listError && (
                <p className="venta-form__mencion-empty venta-form__mencion-empty--error">{listError}</p>
              )}
              {especialidad && !loading && !listError && results.length === 0 && (
                <p className="venta-form__mencion-empty">No se encontraron menciones para esta especialidad.</p>
              )}

              {especialidad && !loading && results.length > 0 && (
                <ul className="venta-form__mencion-list">
                  {results.map((row) => (
                    <li key={`${row.nro}-${row.mencion}`}>
                      <button
                        type="button"
                        className="venta-form__mencion-item"
                        onClick={() => handleSelect(row)}
                      >
                        <span className="venta-form__mencion-item-nro">{row.nro || '—'}</span>
                        <span className="venta-form__mencion-item-body">
                          <span className="venta-form__mencion-item-title">{row.mencion}</span>
                          <span className="venta-form__mencion-item-meta">
                            {row.especialidad}
                            {row.p_certificado ? ` · ${row.p_certificado}` : ''}
                            {row.horas ? ` · ${row.horas} H` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {error && <span className="venta-form__field-error" role="alert">{error}</span>}
    </div>
  )
}

export default MencionPicker
