import { useState, useEffect } from 'react'
import api from '../utils/api'
import ConfirmModal from './ConfirmModal'
import './GestionClientes.css'

function GestionClientes() {
  const [clientes, setClientes] = useState([])
  const [clientesFiltrados, setClientesFiltrados] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState(null)
  const [formData, setFormData] = useState({
    dni: '',
    nombreCompleto: '',
    email: '',
    telefono: '',
  })

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    setLoading(true)
    setError('')
    try {
      // Cargar todos los clientes (sin filtro en el servidor para paginación local)
      const response = await api.get('/admin/clientes')
      setClientes(response.data.clientes || [])
    } catch (err) {
      // Formatear error
      let errorMsg = 'Error al cargar clientes'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(e => e.msg || String(e)).join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else {
          errorMsg = JSON.stringify(err.response.data.detail)
        }
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes localmente cuando cambia el searchTerm
  useEffect(() => {
    if (!searchTerm.trim()) {
      setClientesFiltrados(clientes)
      setCurrentPage(1)
      return
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const clientesArray = Array.isArray(clientes) ? clientes : []
    const filtrados = clientesArray.filter(cliente => {
      const dni = String(cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || '').toLowerCase()
      const nombre = String(cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || '').toLowerCase()
      const telefono = String(cliente['CELULAR DEL CLIENTE'] || cliente.TELEFONO || cliente.telefono || '').toLowerCase()

      return dni.includes(searchLower) ||
        nombre.includes(searchLower) ||
        telefono.includes(searchLower)
    })

    setClientesFiltrados(filtrados)
    setCurrentPage(1) // Resetear a primera página al buscar
  }, [searchTerm, clientes])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Preparar datos para enviar (enviar nombreCompleto directamente, sin separar)
      const payload = {}

      if (editingCliente) {
        // Para actualizar: no enviar dni (va en la URL), solo campos que se pueden actualizar
        if (formData.nombreCompleto && String(formData.nombreCompleto).trim()) {
          payload.nombreCompleto = String(formData.nombreCompleto).trim()
        }
        // Enviar email y telefono solo si tienen valor (no enviar si están vacíos)
        if (formData.email && String(formData.email).trim()) {
          payload.email = String(formData.email).trim()
        }
        if (formData.telefono && String(formData.telefono).trim()) {
          payload.telefono = String(formData.telefono).trim()
        }
      } else {
        // Para crear: incluir todos los campos necesarios
        if (formData.dni) {
          payload.dni = formData.dni
        }
        if (formData.nombreCompleto && String(formData.nombreCompleto).trim()) {
          payload.nombreCompleto = String(formData.nombreCompleto).trim()
        }
        if (formData.email && String(formData.email).trim()) {
          payload.email = String(formData.email).trim()
        }
        if (formData.telefono && String(formData.telefono).trim()) {
          payload.telefono = String(formData.telefono).trim()
        }
      }

      if (editingCliente) {
        // Actualizar
        const dni = editingCliente['DNI DEL CLIENTE'] || editingCliente.DNI || editingCliente.dni

        // Verificar que haya al menos un campo para actualizar
        if (Object.keys(payload).length === 0) {
          setError('Debe completar al menos un campo para actualizar')
          setLoading(false)
          return
        }

        await api.put(`/admin/clientes/${dni}`, payload)
        setSuccess('Cliente actualizado exitosamente')
      } else {
        // Crear
        await api.post('/admin/clientes', payload)
        setSuccess('Cliente creado exitosamente')
      }

      setShowForm(false)
      setEditingCliente(null)
      setFormData({
        dni: '',
        nombreCompleto: '',
        email: '',
        telefono: '',
      })
      cargarClientes()
      setCurrentPage(1) // Resetear a primera página
    } catch (err) {
      // Formatear error de validación (422)
      let errorMsg = 'Error al guardar cliente'

      if (err.response?.data) {
        // Si hay errores de validación detallados
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const validationErrors = err.response.data.errors.map(e => {
            const field = e.loc?.join('.') || 'campo desconocido'
            return `${field}: ${e.msg || 'error de validación'}`
          })
          errorMsg = `Errores de validación: ${validationErrors.join('; ')}`
        } else if (err.response.data.detail) {
          if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map(e => e.msg || String(e)).join(', ')
          } else if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail
          } else {
            errorMsg = JSON.stringify(err.response.data.detail)
          }
        }
      } else if (err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cliente) => {
    setEditingCliente(cliente)

    // Obtener nombre completo directamente
    const nombreCompleto = cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || ''

    setFormData({
      dni: cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || '',
      nombreCompleto: nombreCompleto,
      email: cliente['CORREO DEL CLIENTE'] || cliente.EMAIL || cliente.email || '',
      telefono: cliente['CELULAR DEL CLIENTE'] || cliente.TELEFONO || cliente.telefono || '',
    })
    setShowForm(true)
  }

  const handleDeleteClick = (cliente) => {
    setClienteToDelete(cliente)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return

    const dni = clienteToDelete['DNI DEL CLIENTE'] || clienteToDelete.DNI || clienteToDelete.dni
    if (!dni) {
      setError('No se pudo obtener el DNI del cliente')
      setShowDeleteModal(false)
      setClienteToDelete(null)
      return
    }

    setLoading(true)
    setShowDeleteModal(false)
    try {
      await api.delete(`/admin/clientes/${dni}`)
      setSuccess('Cliente eliminado exitosamente')
      cargarClientes()
    } catch (err) {
      // Formatear error
      let errorMsg = 'Error al eliminar cliente'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(e => e.msg || String(e)).join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else {
          errorMsg = JSON.stringify(err.response.data.detail)
        }
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
      setClienteToDelete(null)
    }
  }

  const handleNew = () => {
    setEditingCliente(null)
    setFormData({
      dni: '',
      nombreCompleto: '',
      email: '',
      telefono: '',
    })
    setShowForm(true)
  }

  return (
    <div className="gestion-clientes">
      <div className="header-section">
        <h2>Gestión de Clientes</h2>
        <button className="btn-primary" onClick={handleNew} disabled={loading}>
          + Nuevo Cliente
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setClienteToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cliente"
        message={`¿Está seguro de eliminar al cliente ${clienteToDelete ? (clienteToDelete['NOMBRE COMPLETO DEL CLIENTE'] || clienteToDelete.NOMBRES || '') : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      <div className="search-section">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Buscar por DNI, nombre completo o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm('')}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        <div className="search-info">
          {searchTerm ? (
            <span>
              {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>
              Total: {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <h3>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="dni">DNI *</label>
                  <input
                    type="text"
                    id="dni"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    required
                    disabled={!!editingCliente}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="nombreCompleto">Nombre Completo *</label>
                  <input
                    type="text"
                    id="nombreCompleto"
                    name="nombreCompleto"
                    value={formData.nombreCompleto}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="text"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : editingCliente ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCliente(null)
                  }}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="clientes-table-wrapper">
        {loading && clientes.length === 0 ? (
          <div className="loading">Cargando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'No se encontraron clientes con ese criterio de búsqueda' : 'No se encontraron clientes'}
          </div>
        ) : (
          <>
            {/* Vista de tabla para desktop */}
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre Completo</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((cliente, idx) => (
                    <tr key={idx}>
                      <td>{cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || '-'}</td>
                      <td>{cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || '-'}</td>
                      <td>{cliente['CELULAR DEL CLIENTE'] || cliente.TELEFONO || cliente.telefono || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(cliente)}
                            title="Editar"
                          >
                            {'\u270F\uFE0F'}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteClick(cliente)}
                            title="Eliminar"
                          >
                            {'\u{1F5D1}\uFE0F'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Vista de cards para móviles */}
            <div className="clientes-cards-container">
              {clientesFiltrados
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((cliente, idx) => (
                  <div key={idx} className="cliente-card">
                    <div className="card-header">
                      <h3>{cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || '-'}</h3>
                    </div>
                    <div className="card-body">
                      <div className="card-field">
                        <span className="card-label">DNI:</span>
                        <span className="card-value">{cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || '-'}</span>
                      </div>
                      <div className="card-field">
                        <span className="card-label">Teléfono:</span>
                        <span className="card-value">{cliente['CELULAR DEL CLIENTE'] || cliente.TELEFONO || cliente.telefono || '-'}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(cliente)}
                        title="Editar"
                      >
                        {'\u270F\uFE0F'} Editar
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClick(cliente)}
                        title="Eliminar"
                      >
                        {'\u{1F5D1}\uFE0F'} Eliminar
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Paginación */}
            {clientesFiltrados.length > itemsPerPage && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {Math.ceil(clientesFiltrados.length / itemsPerPage)}
                  {' '}({clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''})
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(clientesFiltrados.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(clientesFiltrados.length / itemsPerPage)}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default GestionClientes
