import { useState, useEffect } from 'react'
import api from '../utils/api'
import ConfirmModal from './ConfirmModal'
import './ListaCertificados.css'

function ListaCertificados() {
  const ITEMS_PER_PAGE = 15
  const [certificados, setCertificados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [certificadoToDelete, setCertificadoToDelete] = useState(null)

  useEffect(() => {
    fetchCertificados()
  }, [])

  const fetchCertificados = async () => {
    try {
      const response = await api.get('/admin/certificados')
      setCertificados(Array.isArray(response.data) ? response.data : [])
      setCurrentPage(1)
    } catch (_) {
      setError('Error al cargar los certificados')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadQR = async (codigo) => {
    try {
      const response = await api.get(`/admin/certificados/${codigo}/qr`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `qr_${codigo}.png`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (_) {
      setError('Error al descargar el QR')
    }
  }

  const handleDeleteClick = (codigo) => {
    setCertificadoToDelete(codigo)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!certificadoToDelete) return

    try {
      await api.delete(`/admin/certificados/${certificadoToDelete}`)
      setShowDeleteModal(false)
      setCertificadoToDelete(null)
      setSuccess('Certificado eliminado exitosamente')
      fetchCertificados()
    } catch (_) {
      setError('Error al eliminar el certificado')
      setShowDeleteModal(false)
      setCertificadoToDelete(null)
    }
  }

  const copyLink = (codigo) => {
    const link = `${window.location.origin}/certificado/${codigo}`
    navigator.clipboard.writeText(link)
    setSuccess('Link copiado al portapapeles!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const certificadosArray = Array.isArray(certificados) ? certificados : []
  const filteredCertificados = certificadosArray.filter((cert) => {
    const searchLower = searchTerm.toLowerCase().trim()
    return (
      cert?.codigo?.toLowerCase().includes(searchLower) ||
      cert?.nombres?.toLowerCase().includes(searchLower) ||
      cert?.apellidos?.toLowerCase().includes(searchLower) ||
      cert?.curso?.toLowerCase().includes(searchLower)
    )
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredCertificados.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const paginatedCertificados = filteredCertificados.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  if (loading) {
    return <div className="loading">Cargando certificados...</div>
  }

  return (
    <div className="lista-certificados">
      <div className="lista-header">
        <h2>Lista de Certificados</h2>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setCertificadoToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          title="Eliminar Certificado"
          message={`Esta seguro de eliminar el certificado con codigo ${certificadoToDelete}? Esta accion no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
        />

        <input
          type="text"
          placeholder="Buscar certificados..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="certificados-table-container">
        <table className="certificados-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nombre Completo</th>
              <th>Curso</th>
              <th>Fecha Emision</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCertificados.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No hay certificados registrados
                </td>
              </tr>
            ) : (
              paginatedCertificados.map((cert) => (
                <tr key={cert.codigo} className={cert.estado === 'ANULADO' ? 'anulado' : ''}>
                  <td>{cert.codigo}</td>
                  <td>
                    {cert.nombre_completo || `${cert.nombres || ''} ${cert.apellidos || ''}`.trim() || '-'}
                  </td>
                  <td>{cert.curso}</td>
                  <td>{cert.fecha_emision}</td>
                  <td>
                    <span className={`badge ${cert.estado === 'VALIDO' ? 'valido' : 'anulado'}`}>
                      {cert.estado}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => copyLink(cert.codigo)}
                        className="btn-action btn-copy"
                        title="Copiar link"
                      >
                        {'\u{1F517}'}
                      </button>
                      <button
                        onClick={() => handleDownloadQR(cert.codigo)}
                        className="btn-action btn-qr"
                        title="Descargar QR"
                      >
                        {'\u{1F4F1}'}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cert.codigo)}
                        className="btn-action btn-anular"
                        title="Eliminar"
                      >
                        {'\u274C'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="certificados-cards-container">
        {paginatedCertificados.length === 0 ? (
          <div className="no-data-card">
            No hay certificados registrados
          </div>
        ) : (
          paginatedCertificados.map((cert) => (
            <div key={cert.codigo} className={`certificado-card ${cert.estado === 'ANULADO' ? 'anulado' : ''}`}>
              <div className="card-header">
                <div className="card-title">
                  <h3>{cert.nombre_completo || `${cert.nombres || ''} ${cert.apellidos || ''}`.trim() || '-'}</h3>
                  <span className={`badge ${cert.estado === 'VALIDO' ? 'valido' : 'anulado'}`}>
                    {cert.estado}
                  </span>
                </div>
                <div className="card-codigo">{cert.codigo}</div>
              </div>
              <div className="card-body">
                <div className="card-field">
                  <span className="card-label">Curso:</span>
                  <span className="card-value">{cert.curso}</span>
                </div>
                <div className="card-field">
                  <span className="card-label">Fecha Emision:</span>
                  <span className="card-value">{cert.fecha_emision}</span>
                </div>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => copyLink(cert.codigo)}
                  className="btn-action btn-copy"
                  title="Copiar link"
                >
                  {'\u{1F517}'} Copiar
                </button>
                <button
                  onClick={() => handleDownloadQR(cert.codigo)}
                  className="btn-action btn-qr"
                  title="Descargar QR"
                >
                  {'\u{1F4F1}'} QR
                </button>
                <button
                  onClick={() => handleDeleteClick(cert.codigo)}
                  className="btn-action btn-anular"
                  title="Eliminar"
                >
                  {'\u274C'} Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredCertificados.length > 0 && (
        <div className="pagination">
          <button
            type="button"
            className="btn-pagination"
            onClick={goToPreviousPage}
            disabled={safeCurrentPage === 1}
          >
            Anterior
          </button>
          <span className="pagination-info">
            Pagina {safeCurrentPage} de {totalPages}
          </span>
          <button
            type="button"
            className="btn-pagination"
            onClick={goToNextPage}
            disabled={safeCurrentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

export default ListaCertificados
