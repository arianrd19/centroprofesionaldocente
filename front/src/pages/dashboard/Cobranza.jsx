import { useApiGet } from '../../hooks/useApiGet'

function Cobranza() {
  const { data, loading } = useApiGet('/dashboard/cobranza')

  if (loading) return <div className="dash-empty">Cargando...</div>
  if (!data) return <div className="dash-empty">Error al cargar cobranza.</div>

  return (
    <div>
      <h1 className="dash-page-title">Mi Cobranza</h1>
      <p className="dash-subtitle">
        {data.month} · Código <strong>{data.codigo}</strong>
      </p>
      {data.error && <div className="dash-alert">{data.error}</div>}

      {(data.cobranzas || []).length === 0 ? (
        <div className="dash-card dash-empty">No hay cobranzas pendientes este mes.</div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Depositado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {data.cobranzas.map((c, i) => (
                <tr key={i}>
                  <td>{c.fecha}</td>
                  <td>{c.cliente}</td>
                  <td>S/ {c.monto_total || 0}</td>
                  <td>S/ {c.monto_depositado || 0}</td>
                  <td>S/ {c.pendiente ?? c.saldo ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Cobranza
