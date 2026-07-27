import { useState } from 'react'
import api from '../../utils/api'

function VentasConsulta() {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('dni')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const buscar = async (e) => {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await api.get('/dashboard/ventas', { params: { q, tipo } })
      setData(res.data)
    } catch (err) {
      console.error(err)
      setData({ success: false, data: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="dash-page-title">Consulta de ventas</h1>
      <p className="dash-subtitle">Busca por DNI o celular del cliente</p>

      <form className="dash-search" onSubmit={buscar}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="dni">DNI</option>
          <option value="celular">Celular</option>
          <option value="ambos">Ambos</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ingresa DNI o celular..."
        />
        <button type="submit" className="dash-btn" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {data && (
        <>
          <p style={{ marginBottom: 12 }}>{data.total} resultado(s)</p>
          {data.total === 0 ? (
            <div className="dash-empty">No se encontraron ventas.</div>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>DNI</th>
                    <th>Tipo</th>
                    <th>Asesor</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.fecha_venta_fmt || r.fecha_venta}</td>
                      <td>{r.cliente}</td>
                      <td>{r.dni}</td>
                      <td>{r.tipo}</td>
                      <td>{r.asesor}</td>
                      <td>{r.monto_total || r.monto_depositado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default VentasConsulta
