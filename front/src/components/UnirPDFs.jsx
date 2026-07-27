import { useRef, useState } from 'react'
import api from '../utils/api'
import './UnirPDFs.css'

function UnirPDFs() {
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
    if (!codigo.trim()) {
      setError('Por favor ingresa un codigo de certificado')
      return
    }

    setError('')
    setCertificado(null)
    setLoading(true)

    try {
      const response = await api.get(`/public/certificados/${codigo.trim()}`)
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

  const handleUnirPDFs = async () => {
    if (!certificado) {
      setError('Primero debes buscar un certificado')
      return
    }

    if (!archivo) {
      setError('Por favor selecciona un archivo PDF para unir')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('pdf_file', archivo)

      await api.post(
        `/admin/certificados/${codigo.trim()}/unir-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setSuccess('PDFs unidos exitosamente. El certificado ahora tiene 2 paginas.')
      limpiarArchivoSeleccionado()
      setCertificado(null)
      setCodigo('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al unir los PDFs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="unir-pdfs-container unir-pdfs-wrapper">
      <div className="unir-pdfs-header">
        <h1>Unir PDFs</h1>
        <p>Une un PDF adicional al certificado generado</p>
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
          <h2>2. Subir PDF adicional</h2>
          <div className="file-upload-area">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              id="pdf-upload"
              ref={fileInputRef}
              className="file-input"
            />
            <label htmlFor="pdf-upload" className="file-label">
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
            onClick={handleUnirPDFs}
            disabled={!certificado || !archivo || loading}
            className="btn-unir"
          >
            {loading ? 'Uniendo PDFs...' : 'Unir PDFs'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnirPDFs
