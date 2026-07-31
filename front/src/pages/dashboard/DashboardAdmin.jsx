import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import ConfirmModal from '../../components/ConfirmModal'
import './DashboardAdmin.css'

const EMPTY_FORM = {
  email: '',
  nombre: '',
  username: '',
  codigo: '',
  password: '',
  rol: 'Asesor',
  estado: 'Activo',
  comision: '20%',
  posicion: '',
}

const ROLES = ['Asesor', 'Admin', 'Operador']
const ESTADOS = ['Activo', 'Inactivo']

function estadoClass(estado) {
  return (estado || '').toLowerCase() === 'activo'
    ? 'dash-admin__badge dash-admin__badge--active'
    : 'dash-admin__badge dash-admin__badge--inactive'
}

function DashboardAdmin() {
  const [asesores, setAsesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const cargarAsesores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/dashboard/admin/asesores')
      setAsesores(res.data?.asesores || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Sin acceso o error al cargar usuarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarAsesores()
  }, [cargarAsesores])

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return asesores
    return asesores.filter((a) => {
      const blob = [a.nombre, a.email, a.codigo, a.username, a.rol].join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [asesores, search])

  const openCreate = () => {
    setEditingEmail(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  const openEdit = (asesor) => {
    setEditingEmail(asesor.email)
    setForm({
      email: asesor.email || '',
      nombre: asesor.nombre || '',
      username: asesor.username || '',
      codigo: asesor.codigo || '',
      password: '',
      rol: asesor.rol || 'Asesor',
      estado: asesor.estado || 'Activo',
      comision: asesor.comision || '20%',
      posicion: asesor.posicion || '',
    })
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingEmail(null)
    setForm({ ...EMPTY_FORM })
  }

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (editingEmail) {
        const payload = {
          email: form.email.trim(),
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          codigo: form.codigo.trim(),
          rol: form.rol,
          estado: form.estado,
          comision: form.comision.trim(),
          posicion: form.posicion.trim(),
        }
        if (form.password.trim()) {
          payload.password = form.password.trim()
        }
        const res = await api.put(
          `/dashboard/admin/asesores/${encodeURIComponent(editingEmail)}`,
          payload,
        )
        setSuccess(res.data?.message || 'Usuario actualizado.')
      } else {
        const res = await api.post('/dashboard/admin/asesores', {
          email: form.email.trim(),
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          codigo: form.codigo.trim(),
          password: form.password.trim(),
          rol: form.rol,
          estado: form.estado,
          comision: form.comision.trim() || '20%',
          posicion: form.posicion.trim(),
        })
        setSuccess(res.data?.message || 'Usuario creado.')
      }
      await cargarAsesores()
      closeModal()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (asesor) => {
    setDeleteTarget(asesor)
    setError('')
    setSuccess('')
  }

  const cancelDelete = () => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.email || deleting) return
    setDeleting(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.delete(
        `/dashboard/admin/asesores/${encodeURIComponent(deleteTarget.email)}`,
      )
      setSuccess(res.data?.message || 'Usuario eliminado correctamente.')
      setDeleteTarget(null)
      await cargarAsesores()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo eliminar el usuario.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="dash-empty">Cargando usuarios...</div>

  return (
    <div className="dash-admin">
      <header className="dash-admin__header">
        <div>
          <h1 className="dash-page-title">Gestionar usuarios</h1>
          <p className="dash-subtitle">{asesores.length} usuarios en CREDENCIALES</p>
        </div>
        <button type="button" className="dash-btn" onClick={openCreate}>
          + Nuevo usuario
        </button>
      </header>

      {error && !modalOpen && <div className="dash-alert" role="alert">{error}</div>}
      {success && !modalOpen && <div className="dash-admin__success" role="status">{success}</div>}

      <div className="dash-admin__toolbar">
        <input
          type="search"
          className="dash-admin__search"
          placeholder="Buscar por nombre, email o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar usuarios"
        />
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table dash-admin__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Comisión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="dash-panel__empty">No hay usuarios que coincidan</td>
              </tr>
            ) : (
              filtrados.map((a) => (
                <tr key={a.email}>
                  <td data-label="Código">{a.codigo || '—'}</td>
                  <td data-label="Nombre">{a.nombre || '—'}</td>
                  <td data-label="Email">{a.email}</td>
                  <td data-label="Usuario">{a.username || '—'}</td>
                  <td data-label="Rol">{a.rol || '—'}</td>
                  <td data-label="Estado">
                    <span className={estadoClass(a.estado)}>{a.estado || '—'}</span>
                  </td>
                  <td data-label="Comisión">{a.comision || '—'}</td>
                  <td data-label="Acciones" className="dash-admin__actions">
                    <button type="button" className="dash-btn-link" onClick={() => openEdit(a)}>
                      Editar
                    </button>
                    <Link
                      className="dash-btn-link"
                      to={`/dashboard/ventas?codigo=${encodeURIComponent(a.codigo)}`}
                    >
                      Panel
                    </Link>
                    <button
                      type="button"
                      className="dash-btn-link dash-admin__btn-delete"
                      onClick={() => requestDelete(a)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="dash-admin__overlay" role="presentation" onClick={closeModal}>
          <div
            className="dash-admin__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-admin-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="dash-admin__modal-head">
              <h2 id="dash-admin-modal-title">
                {editingEmail ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button type="button" className="dash-admin__close" onClick={closeModal} aria-label="Cerrar">
                ×
              </button>
            </header>

            <form className="dash-admin__form" onSubmit={handleSubmit}>
              {error && <div className="dash-alert" role="alert">{error}</div>}

              <div className="dash-admin__grid">
                <label className="dash-admin__field">
                  <span>Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField('email')}
                    required
                    autoComplete="off"
                  />
                </label>

                <label className="dash-admin__field">
                  <span>Nombre completo *</span>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={setField('nombre')}
                    required
                  />
                </label>

                <label className="dash-admin__field">
                  <span>Usuario (login) *</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={setField('username')}
                    required
                    autoComplete="off"
                  />
                </label>

                <label className="dash-admin__field">
                  <span>Código *</span>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={setField('codigo')}
                    required
                  />
                </label>

                <label className="dash-admin__field">
                  <span>
                    Contraseña {editingEmail ? '(dejar vacío para no cambiar)' : '*'}
                  </span>
                  <input
                    type="text"
                    value={form.password}
                    onChange={setField('password')}
                    required={!editingEmail}
                    autoComplete="new-password"
                  />
                </label>

                <label className="dash-admin__field">
                  <span>Rol</span>
                  <select value={form.rol} onChange={setField('rol')}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>

                <label className="dash-admin__field">
                  <span>Estado</span>
                  <select value={form.estado} onChange={setField('estado')}>
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>

                <label className="dash-admin__field">
                  <span>Comisión</span>
                  <input
                    type="text"
                    value={form.comision}
                    onChange={setField('comision')}
                    placeholder="20%"
                  />
                </label>

                <label className="dash-admin__field dash-admin__field--full">
                  <span>Posición</span>
                  <input
                    type="text"
                    value={form.posicion}
                    onChange={setField('posicion')}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <footer className="dash-admin__modal-actions">
                <button type="button" className="dash-btn dash-admin__btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="dash-btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingEmail ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        type="danger"
        title="¿Eliminar usuario?"
        message={
          deleteTarget
            ? `Se eliminará permanentemente a ${deleteTarget.nombre || deleteTarget.email} (${deleteTarget.email}) de la hoja CREDENCIALES. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText={deleting ? 'Eliminando...' : 'Sí, eliminar'}
        cancelText="Cancelar"
      />
    </div>
  )
}

export default DashboardAdmin
