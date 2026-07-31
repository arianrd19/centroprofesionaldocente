import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApiGet } from '../../hooks/useApiGet'
import './MiDashboard.css'

function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

function saleMonto(v) {
  return formatMoney(v.monto ?? v.monto_depositado ?? 0)
}

function saleFecha(v) {
  return v.fecha || v.fecha_venta_fmt || v.fecha_venta || '—'
}

function VentaRow({ v, showAsesor }) {
  return (
    <tr>
      {showAsesor && <td>{v.asesor || '—'}</td>}
      <td>{saleFecha(v)}</td>
      <td>{v.cliente || '—'}</td>
      <td>{v.dni || '—'}</td>
      <td>{v.celular || '—'}</td>
      <td>{v.producto || '—'}</td>
      <td>{saleMonto(v)}</td>
      <td>{v.operacion || '—'}</td>
    </tr>
  )
}

function VentaCard({ v, showAsesor }) {
  return (
    <article className="dash-panel__sale-card">
      <header className="dash-panel__sale-head">
        <div>
          <div className="dash-panel__sale-title">{v.cliente || '—'}</div>
          <div className="dash-panel__sale-date">{saleFecha(v)}</div>
        </div>
        <div className="dash-panel__sale-amount">S/ {saleMonto(v)}</div>
      </header>
      <div className="dash-panel__sale-grid">
        {showAsesor && (
          <div className="dash-panel__sale-field">
            <span className="dash-panel__sale-field-label">Asesor</span>
            <span className="dash-panel__sale-field-value">{v.asesor || '—'}</span>
          </div>
        )}
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">DNI</span>
          <span className="dash-panel__sale-field-value">{v.dni || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Celular</span>
          <span className="dash-panel__sale-field-value">{v.celular || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Producto</span>
          <span className="dash-panel__sale-field-value">{v.producto || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Operación</span>
          <span className="dash-panel__sale-field-value">{v.operacion || '—'}</span>
        </div>
      </div>
    </article>
  )
}

function CertificadoCard({ c, showAsesor }) {
  return (
    <article className="dash-panel__sale-card dash-panel__sale-card--cert">
      <header className="dash-panel__sale-head">
        <div>
          <div className="dash-panel__sale-title">{c.cliente || '—'}</div>
          <div className="dash-panel__sale-date">{c.fecha || '—'}</div>
        </div>
        <div className="dash-panel__sale-amount">S/ {formatMoney(c.monto_depositado)}</div>
      </header>
      <div className="dash-panel__sale-grid">
        {showAsesor && (
          <div className="dash-panel__sale-field">
            <span className="dash-panel__sale-field-label">Asesor</span>
            <span className="dash-panel__sale-field-value">{c.asesor || '—'}</span>
          </div>
        )}
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Celular</span>
          <span className="dash-panel__sale-field-value">{c.celular || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Especialidad</span>
          <span className="dash-panel__sale-field-value">{c.especialidad || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Tipo documento</span>
          <span className="dash-panel__sale-field-value">{c.tipo_documento || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Horas</span>
          <span className="dash-panel__sale-field-value">{c.horas || '—'}</span>
        </div>
      </div>
    </article>
  )
}

function SerumsCard({ v, showAsesor }) {
  return (
    <article className="dash-panel__sale-card dash-panel__sale-card--serums">
      <header className="dash-panel__sale-head">
        <div>
          <div className="dash-panel__sale-title">{v.cliente || '—'}</div>
          <div className="dash-panel__sale-date">{saleFecha(v)}</div>
        </div>
        <div className="dash-panel__sale-amount">S/ {saleMonto(v)}</div>
      </header>
      <div className="dash-panel__sale-grid">
        {showAsesor && (
          <div className="dash-panel__sale-field">
            <span className="dash-panel__sale-field-label">Asesor</span>
            <span className="dash-panel__sale-field-value">{v.asesor || '—'}</span>
          </div>
        )}
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">DNI</span>
          <span className="dash-panel__sale-field-value">{v.dni || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Celular</span>
          <span className="dash-panel__sale-field-value">{v.celular || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Especialidad</span>
          <span className="dash-panel__sale-field-value">{v.especialidad || '—'}</span>
        </div>
        <div className="dash-panel__sale-field">
          <span className="dash-panel__sale-field-label">Operación</span>
          <span className="dash-panel__sale-field-value">{v.operacion || '—'}</span>
        </div>
      </div>
    </article>
  )
}

function matchesQuery(item, query) {
  if (!query) return true
  const cliente = String(item.cliente || '').toLowerCase()
  const dni = String(item.dni || '').toLowerCase()
  return cliente.includes(query) || dni.includes(query)
}

function MiDashboard() {
  const [searchParams] = useSearchParams()
  const codigoParam = searchParams.get('codigo') || ''
  const requestParams = codigoParam ? { codigo: codigoParam } : {}
  const { data, loading } = useApiGet('/dashboard/mi-dashboard', requestParams, [codigoParam])
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const ultimasCursos = useMemo(
    () => (data?.ultimas_cursos || data?.ultimas || []).filter((v) => matchesQuery(v, normalizedQuery)),
    [data, normalizedQuery],
  )
  const ultimosSerums = useMemo(
    () => (data?.ultimos_serums || []).filter((v) => matchesQuery(v, normalizedQuery)),
    [data, normalizedQuery],
  )
  const ultimosCertificados = useMemo(
    () => (data?.ultimos_certificados || []).filter((v) => matchesQuery(v, normalizedQuery)),
    [data, normalizedQuery],
  )

  if (loading) return <div className="dash-empty">Cargando...</div>
  if (!data) return <div className="dash-empty">Error al cargar panel.</div>

  const emptyLabel = (defaultLabel) => (normalizedQuery ? 'Sin resultados para tu búsqueda' : defaultLabel)
  const showAsesor = !!data.all_asesores

  return (
    <div className="dash-panel">
      <header className="dash-panel__header">
        <h1>{showAsesor ? 'Listado de ventas — todos los asesores' : 'Últimas ventas'}</h1>
        <p>Resumen de {data.month}</p>
      </header>

      {data.error && <div className="dash-alert">{data.error}</div>}

      <div className="dash-panel__search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por cliente o DNI..."
          aria-label="Filtrar últimas ventas por cliente o DNI"
        />
      </div>

      <section className="dash-panel__section" aria-label="Últimas ventas cursos">
        <h2>Últimas ventas (cursos)</h2>

        <div className="dash-panel__table-wrap dash-panel__table-wrap--desktop">
          <div className="dash-panel__table-scroll">
            <table className="dash-panel__table">
              <thead>
                <tr>
                  {showAsesor && <th>Asesor</th>}
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Celular</th>
                  <th>Producto</th>
                  <th>Monto (S/)</th>
                  <th>Operación</th>
                </tr>
              </thead>
              <tbody>
                {ultimasCursos.length === 0 ? (
                  <tr>
                    <td colSpan={showAsesor ? 8 : 7} className="dash-panel__empty">
                      {emptyLabel('Sin ventas de cursos este mes')}
                    </td>
                  </tr>
                ) : (
                  ultimasCursos.map((v, i) => <VentaRow key={i} v={v} showAsesor={showAsesor} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel__sale-cards dash-panel__sale-cards--mobile-only">
          {ultimasCursos.length === 0 ? (
            <article className="dash-panel__sale-card">
              <div className="dash-panel__sale-title">{emptyLabel('Sin ventas de cursos este mes')}</div>
            </article>
          ) : (
            ultimasCursos.map((v, i) => <VentaCard key={i} v={v} showAsesor={showAsesor} />)
          )}
        </div>
      </section>

      <section className="dash-panel__section" aria-label="Últimas ventas serums">
        <h2>
          Últimas ventas (serums)
          {data.count_serums > 0 ? ` (${data.count_serums})` : ''}
        </h2>

        <div className="dash-panel__table-wrap dash-panel__table-wrap--desktop">
          <div className="dash-panel__table-scroll">
            <table className="dash-panel__table">
              <thead>
                <tr>
                  {showAsesor && <th>Asesor</th>}
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Especialidad</th>
                  <th>Monto (S/)</th>
                  <th>Operación</th>
                </tr>
              </thead>
              <tbody>
                {ultimosSerums.length === 0 ? (
                  <tr>
                    <td colSpan={showAsesor ? 7 : 6} className="dash-panel__empty">
                      {emptyLabel('Sin ventas serums este mes')}
                    </td>
                  </tr>
                ) : (
                  ultimosSerums.map((v, i) => (
                    <tr key={i}>
                      {showAsesor && <td>{v.asesor || '—'}</td>}
                      <td>{saleFecha(v)}</td>
                      <td>{v.cliente || '—'}</td>
                      <td>{v.dni || '—'}</td>
                      <td>{v.especialidad || '—'}</td>
                      <td>{saleMonto(v)}</td>
                      <td>{v.operacion || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel__sale-cards dash-panel__sale-cards--mobile-only">
          {ultimosSerums.length === 0 ? (
            <article className="dash-panel__sale-card">
              <div className="dash-panel__sale-title">{emptyLabel('Sin ventas serums este mes')}</div>
            </article>
          ) : (
            ultimosSerums.map((v, i) => <SerumsCard key={i} v={v} showAsesor={showAsesor} />)
          )}
        </div>
      </section>

      <section className="dash-panel__section" aria-label="Últimos certificados">
        <h2>
          Últimos certificados
          {data.cert_count > 0 ? ` (${data.cert_count})` : ''}
        </h2>

        <div className="dash-panel__table-wrap dash-panel__table-wrap--desktop">
          <div className="dash-panel__table-scroll">
            <table className="dash-panel__table">
              <thead>
                <tr>
                  {showAsesor && <th>Asesor</th>}
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Celular</th>
                  <th>Especialidad</th>
                  <th>Monto (S/)</th>
                  <th>Tipo Documento</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                {ultimosCertificados.length === 0 ? (
                  <tr>
                    <td colSpan={showAsesor ? 8 : 7} className="dash-panel__empty">
                      {emptyLabel('Sin certificados este mes')}
                    </td>
                  </tr>
                ) : (
                  ultimosCertificados.map((c, i) => (
                    <tr key={i}>
                      {showAsesor && <td>{c.asesor || '—'}</td>}
                      <td>{c.fecha || '—'}</td>
                      <td>{c.cliente || '—'}</td>
                      <td>{c.celular || '—'}</td>
                      <td>{c.especialidad || '—'}</td>
                      <td>{formatMoney(c.monto_depositado)}</td>
                      <td>{c.tipo_documento || '—'}</td>
                      <td>{c.horas || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel__sale-cards dash-panel__sale-cards--mobile-only">
          {ultimosCertificados.length === 0 ? (
            <article className="dash-panel__sale-card">
              <div className="dash-panel__sale-title">{emptyLabel('Sin certificados este mes')}</div>
            </article>
          ) : (
            ultimosCertificados.map((c, i) => <CertificadoCard key={i} c={c} showAsesor={showAsesor} />)
          )}
        </div>
      </section>
    </div>
  )
}

export default MiDashboard
