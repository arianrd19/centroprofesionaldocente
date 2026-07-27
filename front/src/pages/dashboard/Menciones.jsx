import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApiGet } from '../../hooks/useApiGet'
import './Menciones.css'

function Menciones() {
  const [searchParams, setSearchParams] = useSearchParams()

  const qParam = searchParams.get('q') || ''
  const espParam = searchParams.get('especialidad') || ''
  const certParam = searchParams.get('p_certificado') || ''
  const pageParam = Number(searchParams.get('page') || 1)

  const [q, setQ] = useState(qParam)
  const [especialidad, setEspecialidad] = useState(espParam)
  const [pCertificado, setPCertificado] = useState(certParam)

  useEffect(() => {
    setQ(qParam)
    setEspecialidad(espParam)
    setPCertificado(certParam)
  }, [qParam, espParam, certParam])

  const { data, loading } = useApiGet(
    '/dashboard/menciones',
    {
      q: qParam,
      especialidad: espParam,
      p_certificado: certParam,
      page: pageParam,
    },
    [qParam, espParam, certParam, pageParam],
  )

  const handleFilter = (e) => {
    e.preventDefault()
    setSearchParams({
      q,
      especialidad,
      p_certificado: pCertificado,
      page: '1',
    })
  }

  const goToPage = (page) => {
    setSearchParams({
      q: qParam,
      especialidad: espParam,
      p_certificado: certParam,
      page: String(page),
    })
  }

  if (loading && !data) return <div className="dash-empty">Cargando...</div>

  const pagination = data?.pagination || {}
  const rows = data?.rows || []

  return (
    <div className="dash-menciones">
      <h1 className="dash-page-title">Menciones</h1>
      <form className="dash-search" onSubmit={handleFilter}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por NRO o mención..."
        />
        <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
          <option value="">Todas las especialidades</option>
          {(data?.especialidades || []).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select value={pCertificado} onChange={(e) => setPCertificado(e.target.value)}>
          <option value="">Todos los certificados</option>
          {(data?.p_certificados || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button type="submit" className="dash-btn">Filtrar</button>
      </form>

      <div className="dash-table-wrap dash-menciones__table-wrap--desktop">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Nro</th>
              <th>Especialidad</th>
              <th>P. Certificado</th>
              <th>Mención</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nro || r.id}>
                <td>{r.nro}</td>
                <td>{r.especialidad}</td>
                <td>{r.p_certificado}</td>
                <td>{r.mencion}</td>
                <td>{r.horas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dash-menciones__cards" aria-label="Listado de menciones">
        {rows.length === 0 ? (
          <p className="dash-menciones__empty">No hay menciones para mostrar.</p>
        ) : (
          rows.map((r) => (
            <article key={r.nro || r.id} className="dash-menciones__card">
              <div className="dash-menciones__card-head">
                <span className="dash-menciones__card-nro">NRO {r.nro || '—'}</span>
                {r.horas != null && r.horas !== '' && (
                  <span className="dash-menciones__card-horas">{r.horas} H</span>
                )}
              </div>
              <h2 className="dash-menciones__card-title">{r.mencion}</h2>
              <p className="dash-menciones__card-meta">
                {[r.especialidad, r.p_certificado].filter(Boolean).join(' · ')}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="dash-pagination">
        {pagination.has_prev && (
          <button type="button" className="dash-btn" onClick={() => goToPage(pagination.page - 1)}>
            ← Anterior
          </button>
        )}
        <span>Pág. {pagination.page} / {pagination.pages || 1} ({pagination.total} total)</span>
        {pagination.has_next && (
          <button type="button" className="dash-btn" onClick={() => goToPage(pagination.page + 1)}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  )
}

export default Menciones
