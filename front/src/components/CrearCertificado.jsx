import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getApiUrl } from '../utils/api'
import './CrearCertificado.css'

function CrearCertificado() {
  const navigate = useNavigate()
  const anioOptions = Array.from({ length: 11 }, (_, index) => String(2021 + index))
  const currentYear = new Date().getFullYear()
  const defaultAnio = currentYear >= 2021 && currentYear <= 2031 ? String(currentYear) : '2026'
  const [loading, setLoading] = useState(false)
  const [loadingMenciones, setLoadingMenciones] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [menciones, setMenciones] = useState([])
  const [mencionSeleccionada, setMencionSeleccionada] = useState(null)
  const [camposBloqueados, setCamposBloqueados] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(null)
  const [nombreCompletoCliente, setNombreCompletoCliente] = useState('') // Nombre completo del cliente encontrado
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const searchTimeoutRef = useRef(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nombreCompleto: '', // Un solo campo para nombre completo
    dni: '',
    anio: defaultAnio,
    n_folio: '',
    n_libro: '',
    curso: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    horas: '',
    estado: 'VALIDO',
  })

  // Cargar menciones al montar el componente
  useEffect(() => {
    cargarMenciones()
  }, [])

  const cargarMenciones = async () => {
    setLoadingMenciones(true)
    setError('')
    try {
      const response = await api.get('/admin/menciones?source=sheets')
      const mencionesData = response.data.menciones || []
      setMenciones(mencionesData)

      if (mencionesData.length === 0) {
        setError('No se encontraron menciones. Verifica la conexión con Google Sheets.')
      }
    } catch (err) {
      // Formatear error
      let errorMsg = 'Error al cargar las menciones. Verifica la conexión.'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(e => e.msg || String(e)).join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else {
          errorMsg = JSON.stringify(err.response.data.detail)
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      setError(errorMsg)
    } finally {
      setLoadingMenciones(false)
    }
  }

  const handleMencionChange = async (e) => {
    const nro = e.target.value
    setError('')

    if (!nro || nro === '') {
      // Limpiar datos si no hay selección
      setMencionSeleccionada(null)
      setCamposBloqueados(false)
      setFormData(prev => ({
        ...prev,
        curso: '',
        horas: '',
        fecha_emision: new Date().toISOString().split('T')[0],
      }))
      return
    }

    try {
      setLoading(true)
      // Obtener datos de la mención seleccionada
      const response = await api.get(`/admin/menciones/${nro}`)
      const mencion = response.data

      if (!mencion || !mencion.nro) {
        throw new Error('Mensión no encontrada')
      }

      setMencionSeleccionada(mencion)
      setCamposBloqueados(true)

      // Cargar datos de la mención en el formulario
      setFormData(prev => ({
        ...prev,
        curso: mencion.p_certificado || '',
        horas: mencion.horas || '',
        fecha_emision: parsearFecha(mencion.f_emision) || prev.fecha_emision,
      }))
    } catch (err) {
      // Formatear error
      let errorMsg = 'Error al cargar la mención seleccionada'
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
      setMencionSeleccionada(null)
      setCamposBloqueados(false)
    } finally {
      setLoading(false)
    }
  }

  const parsearFecha = (fechaTexto) => {
    if (!fechaTexto) return ''

    // Intentar parsear diferentes formatos de fecha
    // Ejemplo: "11 de julio del 2025" -> "2025-07-11"
    try {
      const meses = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      }

      // Formato: "11 de julio del 2025"
      const match = fechaTexto.match(/(\d+)\s+de\s+(\w+)\s+del?\s+(\d+)/i)
      if (match) {
        const dia = match[1].padStart(2, '0')
        const mes = meses[match[2].toLowerCase()] || '01'
        const año = match[3]
        return `${año}-${mes}-${dia}`
      }

      // Si ya está en formato ISO, retornar tal cual
      if (fechaTexto.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return fechaTexto
      }
    } catch (e) {
      // Error parseando fecha
    }

    return ''
  }

  const buscarClientePorDNI = async (dni) => {
    if (!dni || dni.length < 4) {
      setClienteEncontrado(null)
      return
    }

    setBuscandoCliente(true)
    try {
      const response = await api.get(`/admin/clientes/${dni}`)
      const cliente = response.data

      setClienteEncontrado(cliente)

      // Cargar datos del cliente en el formulario
      // El nombre completo viene en 'NOMBRE COMPLETO DEL CLIENTE' (un solo campo)
      const nombreCompleto = cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || ''

      // Guardar el nombre completo del cliente para enviarlo al backend
      setNombreCompletoCliente(nombreCompleto)

      // Llenar directamente el campo nombreCompleto del formulario
      setFormData(prev => ({
        ...prev,
        nombreCompleto: nombreCompleto || prev.nombreCompleto,
        dni: cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || prev.dni,
      }))
    } catch (err) {
      if (err.response?.status === 404) {
        setClienteEncontrado(null)
        setNombreCompletoCliente('') // Limpiar nombre completo del cliente
        // No limpiar nombreCompleto del formulario si el usuario ya lo escribió
      } else {
        setClienteEncontrado(null)
      }
    } finally {
      setBuscandoCliente(false)
    }
  }

  const handleChange = (e) => {
    // Si el campo está bloqueado, no permitir cambios
    if (camposBloqueados && ['curso', 'horas', 'fecha_emision'].includes(e.target.name)) {
      return
    }

    let newValue = e.target.value

    // Validacion: solo numeros y maximo 3 caracteres en N.FOLIO y N.LIBRO
    if (e.target.name === 'n_folio' || e.target.name === 'n_libro') {
      newValue = newValue.replace(/\D/g, '').slice(0, 3)
    }

    setFormData({
      ...formData,
      [e.target.name]: newValue,
    })

    // Si cambió el DNI, buscar cliente automáticamente con debounce
    if (e.target.name === 'dni') {
      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Establecer nuevo timeout
      searchTimeoutRef.current = setTimeout(() => {
        buscarClientePorDNI(newValue)
      }, 1000)
    }
  }

  const handleThreeDigitBlur = (e) => {
    const { name, value } = e.target
    if ((name === 'n_folio' || name === 'n_libro') && value) {
      let normalized = value.replace(/\D/g, '').slice(0, 3)
      if (name === 'n_folio') {
        const folioNum = parseInt(normalized || '0', 10)
        if (folioNum > 100) normalized = '100'
      }
      normalized = normalized.padStart(3, '0')
      setFormData(prev => ({
        ...prev,
        [name]: normalized,
      }))
    }
  }

  // Función para generar código usando SHA-256 + Base64 (determinístico)
  // Solo usa mencion_nro + dni, sin timestamp, para que siempre genere el mismo código
  const generateCode = async (mencionNro, dni) => {
    if (!mencionNro || !dni) return ''

    // Construir string: mencion_nro + "-" + dni (sin timestamp para que sea determinístico)
    const strInput = `${mencionNro}-${dni}`

    try {
      // Calcular SHA-256 hash
      const encoder = new TextEncoder()
      const data = encoder.encode(strInput)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)

      // Convertir ArrayBuffer a Base64
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashBase64 = btoa(String.fromCharCode(...hashArray))

      // Remover caracteres no alfanuméricos
      const b64Clean = hashBase64.replace(/[^A-Za-z0-9]/g, '')

      // Tomar primeros 12 caracteres
      return b64Clean.substring(0, 12)
    } catch (err) {
      return ''
    }
  }

  // Generar código automáticamente cuando haya mención y DNI
  useEffect(() => {
    const generarCodigo = async () => {
      if (mencionSeleccionada?.nro && formData.dni) {
        const codigo = await generateCode(mencionSeleccionada.nro, formData.dni)
        if (codigo) {
          setFormData(prev => ({
            ...prev,
            codigo: codigo
          }))
        }
      } else {
        // Limpiar código si no hay mención o DNI
        setFormData(prev => ({
          ...prev,
          codigo: ''
        }))
      }
    }

    generarCodigo()
  }, [mencionSeleccionada?.nro, formData.dni])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Generar código automáticamente si no se proporcionó
      // El código se genera en el backend usando SHA-256 + Base64
      // con timestamp + mencion_nro + DNI
      let codigo = formData.codigo
      // Si no hay código, el backend lo generará automáticamente

      // Preparar payload: usar nombre completo del formulario
      const nombreCompletoFinal = formData.nombreCompleto || nombreCompletoCliente || ''

      // Separar nombre completo en nombres y apellidos para el backend
      // (el backend todavía espera nombres y apellidos separados)
      const partesNombre = nombreCompletoFinal.split(' ').filter(p => p.length > 0)
      const nombres = partesNombre.length > 1 ? partesNombre.slice(0, -1).join(' ') : (partesNombre[0] || '')
      const apellidos = partesNombre.length > 1 ? partesNombre[partesNombre.length - 1] : ''

      // Preparar payload: convertir strings vacíos a null para campos opcionales
      // Convertir a string antes de hacer trim para evitar errores con null/undefined
      const dniValue = formData.dni ? String(formData.dni).trim() : null
      const horasValue = formData.horas ? String(formData.horas).trim() : null
      const folioValue = formData.n_folio ? String(formData.n_folio).trim() : ''
      const libroValue = formData.n_libro ? String(formData.n_libro).trim() : ''

      if (!/^\d{1,3}$/.test(folioValue) || !/^\d{1,3}$/.test(libroValue)) {
        setError('N.FOLIO y N.LIBRO deben tener solo numeros y maximo 3 digitos.')
        setLoading(false)
        return
      }

      const folioNum = parseInt(folioValue, 10)
      const libroNum = parseInt(libroValue, 10)
      if (folioNum < 1 || folioNum > 100) {
        setError('N.FOLIO debe estar entre 001 y 100.')
        setLoading(false)
        return
      }
      if (libroNum < 1) {
        setError('N.LIBRO debe ser mayor o igual a 001.')
        setLoading(false)
        return
      }

      const payload = {
        codigo: formData.codigo,
        nombres: nombres || nombreCompletoFinal, // Si no se puede separar, usar todo como nombres
        apellidos: apellidos,
        dni: dniValue || null,
        anio: formData.anio ? String(formData.anio).trim() : null,
        n_folio: folioValue.padStart(3, '0'),
        n_libro: libroValue.padStart(3, '0'),
        curso: formData.curso,
        fecha_emision: formData.fecha_emision,
        horas: horasValue || null,
        estado: formData.estado,
        // Incluir nombre completo para CERTIFICADOS QR
        nombre_completo: nombreCompletoFinal || undefined,
      }

      // Enviar con mencion_nro si hay una seleccionada
      const params = mencionSeleccionada
        ? { mencion_nro: mencionSeleccionada.nro }
        : {}

      const response = await api.post('/admin/certificados', payload, { params })

      // Obtener el código del certificado creado
      const codigoCertificado = response.data?.codigo || formData.codigo

      if (codigoCertificado) {
        // Abrir el PDF en una nueva ventana
        // Usar la función helper para construir la URL completa
        const pdfUrl = getApiUrl(`/public/certificados/${codigoCertificado}/pdf`)

        // Abrir en nueva ventana
        window.open(pdfUrl, '_blank')

        setSuccess('Certificado creado exitosamente! El PDF se está generando...')
      } else {
        setSuccess('Certificado creado exitosamente!')
      }

      setTimeout(() => {
        navigate('/panel/certificados')
      }, 2000)
    } catch (err) {
      // Formatear error sin exponer información sensible
      let errorMsg = 'Error al crear el certificado'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(e => e.msg || String(e)).join('; ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else {
          errorMsg = JSON.stringify(err.response.data.detail)
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (err.message) {
        errorMsg = `Error: ${err.message}`
      }

      // Si no hay conexión con el servidor
      if (!err.response) {
        errorMsg = 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.'
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crear-certificado">
      <h2>Crear Nuevo Certificado</h2>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={handleSubmit} className="certificado-form">
        {/* 1) Arriba: Mención (izq) + DNI (der) */}
        <div className="mencion-selector-container">
          <div className="mencion-selector-column">
            <div className="form-group">
              <label htmlFor="mencion_nro">
                Seleccionar Mención
                {loadingMenciones && <span className="loading-text"> - Cargando...</span>}
              </label>
              <div className="mencion-selector-wrapper">
                <select
                  id="mencion_nro"
                  name="mencion_nro"
                  onChange={handleMencionChange}
                  disabled={loadingMenciones || menciones.length === 0}
                  value={mencionSeleccionada?.nro || ''}
                  className="mencion-select"
                  size={menciones.length > 0 ? undefined : 1}
                >
                  <option value="">
                    {loadingMenciones
                      ? 'Cargando menciones...'
                      : menciones.length === 0
                        ? 'No hay menciones disponibles'
                        : '-- Seleccione una mención --'}
                  </option>
                  {menciones.map((m) => {
                    const textoCompleto = `${m.nro} | ${m.p_certificado || 'Sin título'}`
                    return (
                      <option
                        key={m.nro}
                        value={m.nro}
                        title={textoCompleto}
                        data-mencion={m.mencion}
                        data-especialidad={m.especialidad}
                      >
                        {textoCompleto}
                      </option>
                    )
                  })}
                </select>
                {menciones.length > 0 && (
                  <div className="mencion-count">
                    {menciones.length} menciones disponibles
                  </div>
                )}
                {menciones.length === 0 && !loadingMenciones && (
                  <small className="error-text">No se encontraron menciones. Verifica la conexión con Google Sheets.</small>
                )}
              </div>
            </div>
          </div>

          <div className="mencion-selector-column">
            <div className="form-group">
              <label htmlFor="dni">
                DNI
                {buscandoCliente && <span className="loading-text"> - Buscando cliente...</span>}
                {clienteEncontrado && <span className="client-found-badge">✓ Cliente encontrado</span>}
              </label>
              <input
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder={mencionSeleccionada ? 'Buscar cliente por DNI (se auto-completarán los datos)' : 'Seleccione una mención primero'}
                disabled={!mencionSeleccionada}
                className={clienteEncontrado ? 'client-found' : ''}
              />
              {mencionSeleccionada && clienteEncontrado && (
                <small className="client-info">
                  Cliente: {clienteEncontrado['NOMBRE COMPLETO DEL CLIENTE'] || clienteEncontrado.NOMBRES || ''}
                  {clienteEncontrado['CELULAR DEL CLIENTE'] && ` - Tel: ${clienteEncontrado['CELULAR DEL CLIENTE']}`}
                </small>
              )}
            </div>
          </div>
        </div>

        {/* 2) Debajo: detalle de la mención (expandido) */}
        {mencionSeleccionada && (
          <div className="mencion-info-full">
            <div className="mencion-info">
              <div className="mencion-header">
                <span className="mencion-badge">{mencionSeleccionada.nro}</span>
                <span className="mencion-especialidad">{mencionSeleccionada.especialidad}</span>
              </div>
              <div className="mencion-title">{mencionSeleccionada.p_certificado}</div>
              <div className="mencion-text">{mencionSeleccionada.mencion}</div>
              <div className="mencion-details">
                <span><strong>Horas:</strong> {mencionSeleccionada.horas}</span>
                <span><strong>F. Inicio:</strong> {mencionSeleccionada.f_inicio}</span>
                <span><strong>F. Término:</strong> {mencionSeleccionada.f_termino}</span>
                <span><strong>F. Emisión:</strong> {mencionSeleccionada.f_emision}</span>
              </div>
            </div>
          </div>
        )}
        {/* 3) Debajo: fila 1 (campos antiguos) + fila 2 (campos nuevos) */}
        {mencionSeleccionada && (
          <>
            <div className="form-grid codigo-nombre-row three-cols">
              <div className="form-group">
                <label htmlFor="codigo">Código (auto-generado)</label>
                <input
                  type="text"
                  id="codigo"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  placeholder={formData.dni ? 'Se generará automáticamente' : 'Se generará al ingresar DNI'}
                  readOnly
                  className="codigo-generated"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nombreCompleto">
                  Nombre Completo *
                  {clienteEncontrado && <span className="client-found-badge">✓ Auto-completado</span>}
                </label>
                <input
                  type="text"
                  id="nombreCompleto"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  required
                  disabled={clienteEncontrado}
                  placeholder="Ej: Juan Pérez García"
                  className={clienteEncontrado ? 'client-found' : ''}
                />
                {clienteEncontrado && <span className="locked-badge">🔒 Cargado automáticamente</span>}
              </div>

              <div className="form-group">
                <label htmlFor="estado">Estado *</label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  required
                >
                  <option value="VALIDO">Válido</option>
                  <option value="ANULADO">Anulado</option>
                </select>
              </div>
            </div>

            <div className="form-grid codigo-nombre-row three-cols">
              <div className="form-group">
                <label htmlFor="anio">AÑO *</label>
                <select
                  id="anio"
                  name="anio"
                  value={formData.anio}
                  onChange={handleChange}
                  required
                >
                  {anioOptions.map((anioValue) => (
                    <option key={anioValue} value={anioValue}>
                      {anioValue}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="n_folio">N.FOLIO *</label>
                <input
                  type="text"
                  id="n_folio"
                  name="n_folio"
                  value={formData.n_folio}
                  onChange={handleChange}
                  onBlur={handleThreeDigitBlur}
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  placeholder="Ej: 001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="n_libro">N.LIBRO *</label>
                <input
                  type="text"
                  id="n_libro"
                  name="n_libro"
                  value={formData.n_libro}
                  onChange={handleChange}
                  onBlur={handleThreeDigitBlur}
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  placeholder="Ej: 002"
                />
              </div>
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Certificado'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/panel/certificados')}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default CrearCertificado
