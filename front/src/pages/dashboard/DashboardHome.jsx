import { useApiGet } from '../../hooks/useApiGet'
import './DashboardHome.css'

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatFechaSpanish(value) {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

function formatVolumen(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

function posBadgeClass(posicion) {
  if (posicion === 1) return 'pos--1'
  if (posicion === 2) return 'pos--2'
  if (posicion === 3) return 'pos--3'
  return 'pos--n'
}

function rowClass(u, userCodigo) {
  const classes = []
  const isMe = u.codigo && userCodigo && u.codigo === userCodigo
  if (isMe) classes.push('tr--me')
  if (u.posicion === 1) classes.push('tr--1')
  else if (u.posicion === 2) classes.push('tr--2')
  else if (u.posicion === 3) classes.push('tr--3')
  return classes.join(' ')
}

function DashboardHomeSkeleton() {
  return (
    <div className="dash-home" aria-busy="true" aria-label="Cargando panel">
      <div className="dash-home__skel dash-home__skel--welcome" />
      <div className="dash-home__stats">
        <div className="dash-home__skel dash-home__skel--stat" />
        <div className="dash-home__skel dash-home__skel--stat" />
        <div className="dash-home__skel dash-home__skel--stat" />
      </div>
      <div className="dash-home__skel dash-home__skel--leader" />
    </div>
  )
}

function DashboardHome() {
  const { data, loading } = useApiGet('/dashboard/home')
  const { data: resumen, loading: loadingResumen } = useApiGet('/dashboard/mi-dashboard')

  if (loading) return <DashboardHomeSkeleton />
  if (!data) return <div className="dash-empty">No se pudo cargar el inicio.</div>

  const user = data.user || {}
  const nombre = user.nombre || user.name || user.email || 'Usuario'
  const codigoLinea = user.codigo
    ? (nombre && nombre !== 'Usuario' ? `${user.codigo} - ${nombre}` : user.codigo)
    : '—'
  const posicion = user.posicion ?? '—'
  const volumen = formatVolumen(user.volumen)
  const fecha = formatFechaSpanish(data.now)
  const leaderboard = data.leaderboard || []
  const userCodigo = user.codigo || ''

  return (
    <div className="dash-home">
      <section className="dash-home__welcome" aria-live="polite">
        <h1>¡Bienvenido, {nombre}! 👋</h1>
        <p>{fecha}</p>
      </section>

      {data.warning && <div className="dash-alert">{data.warning}</div>}
      {resumen?.error && <div className="dash-alert">{resumen.error}</div>}

      <section className="dash-home__stats" aria-label="Indicadores personales">
        <article className="dash-home__stat" role="status">
          <div className="dash-home__stat-head">
            <span className="dash-home__stat-icon" aria-hidden>🧾</span>
            <span className="dash-home__stat-title">Código</span>
          </div>
          <div className="dash-home__stat-value">{codigoLinea}</div>
          <div className="dash-home__stat-desc">Tu código de usuario</div>
        </article>

        <article className="dash-home__stat dash-home__stat--secondary" role="status">
          <div className="dash-home__stat-head">
            <span className="dash-home__stat-icon" aria-hidden>🏆</span>
            <span className="dash-home__stat-title">Posición</span>
          </div>
          <div className="dash-home__stat-value">{posicion}</div>
          <div className="dash-home__stat-desc">Tu posición actual</div>
        </article>

        <article className="dash-home__stat dash-home__stat--primary" role="status">
          <div className="dash-home__stat-head">
            <span className="dash-home__stat-icon" aria-hidden>📈</span>
            <span className="dash-home__stat-title">Volumen (S/)</span>
          </div>
          <div className="dash-home__stat-value">{volumen}</div>
          <div className="dash-home__stat-desc">Tu volumen de ventas (ranking)</div>
        </article>
      </section>

      {!loadingResumen && resumen && (
        <section className="dash-home__section" aria-label="Resumen del mes">
          <div className="dash-home__section-title">
            <span aria-hidden>📅</span>
            <span>Resumen de {resumen.month}</span>
          </div>

          <div className="dash-home__stats">
            <article className="dash-home__stat dash-home__stat--secondary" role="status">
              <div className="dash-home__stat-head">
                <span className="dash-home__stat-icon" aria-hidden>🛒</span>
                <span className="dash-home__stat-title">Total ventas</span>
              </div>
              <div className="dash-home__stat-value">{resumen.count ?? 0}</div>
              <div className="dash-home__stat-desc">Ventas registradas este mes</div>
            </article>

            <article className="dash-home__stat dash-home__stat--primary" role="status">
              <div className="dash-home__stat-head">
                <span className="dash-home__stat-icon" aria-hidden>💵</span>
                <span className="dash-home__stat-title">Total volumen (S/)</span>
              </div>
              <div className="dash-home__stat-value">{formatVolumen(resumen.total)}</div>
              <div className="dash-home__stat-desc">Vendido este mes</div>
            </article>

            <article className="dash-home__stat" role="status">
              <div className="dash-home__stat-head">
                <span className="dash-home__stat-icon" aria-hidden>🎯</span>
                <span className="dash-home__stat-title">Comisión (S/)</span>
              </div>
              <div className="dash-home__stat-value">{formatVolumen(resumen.commission)}</div>
              <div className="dash-home__stat-desc">Estimada este mes</div>
            </article>
          </div>

          <div className="dash-home__breakdown">
            <article className="dash-home__breakdown-card dash-home__breakdown-card--cursos">
              <div className="dash-home__breakdown-head">
                <span aria-hidden>🎓</span>
                <span>Cursos</span>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Ventas</span>
                <strong>{resumen.count_cursos ?? 0}</strong>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Volumen (S/)</span>
                <strong>{formatVolumen(resumen.total_cursos)}</strong>
              </div>
            </article>

            <article className="dash-home__breakdown-card dash-home__breakdown-card--certificados">
              <div className="dash-home__breakdown-head">
                <span aria-hidden>📜</span>
                <span>Certificados</span>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Ventas</span>
                <strong>{resumen.count_certificados ?? 0}</strong>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Volumen (S/)</span>
                <strong>{formatVolumen(resumen.total_certificados)}</strong>
              </div>
            </article>

            <article className="dash-home__breakdown-card dash-home__breakdown-card--serums">
              <div className="dash-home__breakdown-head">
                <span aria-hidden>🧪</span>
                <span>Serums</span>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Ventas</span>
                <strong>{resumen.count_serums ?? 0}</strong>
              </div>
              <div className="dash-home__breakdown-row">
                <span>Volumen (S/)</span>
                <strong>{formatVolumen(resumen.total_serums)}</strong>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="dash-home__leader" aria-label="Tabla de posiciones">
        <div className="dash-home__leader-title">
          <span aria-hidden>🏆</span>
          <span>Leaderboard</span>
        </div>

        <div className="dash-home__table-wrap dash-home__table-wrap--desktop" role="region" aria-label="Ranking de asesores">
          <table className="dash-home__table">
            <thead>
              <tr>
                <th scope="col">Posición</th>
                <th scope="col">Nombre</th>
                <th scope="col">Volumen (S/)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={3} className="dash-home__table-empty">
                    <span aria-hidden>🏁</span> Aún no hay ventas registradas este mes
                  </td>
                </tr>
              ) : (
                leaderboard.map((u) => (
                  <tr key={u.codigo || u.nombre} className={rowClass(u, userCodigo)}>
                    <td data-label="Posición">
                      <span className={`dash-home__pos-badge ${posBadgeClass(u.posicion)}`}>
                        <span className="dash-home__pos-emoji" aria-hidden>
                          {u.posicion === 1 ? '👑' : '🏅'}
                        </span>
                        <span className="dash-home__pos-num">{u.posicion}</span>
                      </span>
                    </td>
                    <td data-label="Nombre">{u.nombre}</td>
                    <td data-label="Volumen (S/)">{formatVolumen(u.volumen)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="dash-home__leader-cards" aria-label="Ranking de asesores">
          {leaderboard.length === 0 ? (
            <p className="dash-home__leader-empty">
              <span aria-hidden>🏁</span> Aún no hay ventas registradas este mes
            </p>
          ) : (
            leaderboard.map((u) => (
              <article
                key={u.codigo || u.nombre}
                className={`dash-home__leader-card ${rowClass(u, userCodigo)}`}
              >
                <div className="dash-home__leader-card-top">
                  <span className={`dash-home__pos-badge ${posBadgeClass(u.posicion)}`}>
                    <span className="dash-home__pos-emoji" aria-hidden>
                      {u.posicion === 1 ? '👑' : '🏅'}
                    </span>
                    <span className="dash-home__pos-num">#{u.posicion}</span>
                  </span>
                  <span className="dash-home__leader-card-vol">S/ {formatVolumen(u.volumen)}</span>
                </div>
                <p className="dash-home__leader-card-name">{u.nombre}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default DashboardHome
