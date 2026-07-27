import { useRef, useState } from 'react'
import api from '../utils/api'
import './UnirPDFs.css'

function ReemplazarPDF() {
  const [codigo, setCodigo] = useState('')
  const [certificado, setCertificado] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef(null)

  const limpiarArchivoSeleccionado = () => {
    setArchivo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const buscarCertificado = async () => {
    const codigoLimpio = codigo.trim()
    if (!codigoLimpio) {
      setError('Por favor ingresa un codigo de certificado')
      return
    }

    setError('')
    setCertificado(null)
    setLoading(true)

    try {
      const response = await api.get(`/public/certificados/${codigoLimpio}`)
      if (response.data.found) {
        setCertificado(response.data)
      } else {
        setError('Certificado no encontrado')
      }
    } catch (_) {
      setError('Error al buscar el certificado')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor selecciona un archivo PDF')
        limpiarArchivoSeleccionado()
        return
      }
      setArchivo(file)
      setError('')
    }
  }

  const handleReemplazarPDF = async () => {
    const codigoLimpio = codigo.trim()
    if (!certificado) {
      setError('Primero debes buscar un certificado')
      return
    }

    if (!archivo) {
      setError('Por favor selecciona un archivo PDF para reemplazar')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('pdf_file', archivo)

      await api.post(
        `/admin/certificados/${codigoLimpio}/reemplazar-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setSuccess('PDF reemplazado exitosamente.')
      limpiarArchivoSeleccionado()
      setCertificado(null)
      setCodigo('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al reemplazar el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="unir-pdfs-container unir-pdfs-wrapper">
      <div className="unir-pdfs-header">
        <h1>Reemplazar PDF</h1>
        <p>Sube un PDF para reemplazar por completo el del certificado</p>
      </div>

      <div className="unir-pdfs-content">
        <div className="form-section">
          <h2>1. Buscar Certificado</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Ingresa el codigo del certificado"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarCertificado()}
              className="search-input"
            />
            <button
              type="button"
              onClick={buscarCertificado}
              disabled={loading}
              className="btn-search"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {certificado && (
            <div className="certificado-info">
              <h3>Certificado encontrado:</h3>
              <p><strong>Nombre:</strong> {certificado.nombres} {certificado.apellidos}</p>
              <p><strong>Curso:</strong> {certificado.curso}</p>
              <p><strong>Codigo:</strong> {certificado.codigo}</p>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>2. Subir PDF de reemplazo</h2>
          <div className="file-upload-area">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              id="pdf-upload-replace"
              ref={fileInputRef}
              className="file-input"
            />
            <label htmlFor="pdf-upload-replace" className="file-label">
              {archivo ? archivo.name : 'Seleccionar archivo PDF'}
            </label>
            {archivo && (
              <button
                type="button"
                onClick={limpiarArchivoSeleccionado}
                className="btn-remove-file"
              >
                X
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleReemplazarPDF}
            disabled={!certificado || !archivo || loading}
            className="btn-unir"
          >
            {loading ? 'Reemplazando PDF...' : 'Reemplazar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReemplazarPDF
