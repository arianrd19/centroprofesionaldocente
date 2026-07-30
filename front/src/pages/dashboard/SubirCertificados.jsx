import { useEffect, useRef, useState } from 'react'
import { submitFormData } from '../../utils/submitFormData'
import { getUser } from '../../utils/auth'
import { isClienteLookupReady } from '../../utils/clienteLookup'
import ClienteLookupSection from './ClienteLookupSection'
import {
  CODIGO_OPCIONES,
  CUOTAS_OPCIONES,
  EMPTY_CERT_FORM,
  ENTIDADES_FINANCIERAS,
  ESPECIALIDADES,
  FECHAS_DOCUMENTO,
  HORAS_PEDAGOGICAS,
  TIPOS_DOCUMENTO,
  TIPOS_ENVIO,
  TIPOS_PRODUCTO,
  VALIDADO_POR_OPCIONES,
} from './subirCertificadosOptions'
import MencionPicker from './MencionPicker'
import './SubirVentas.css'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function Field({ label, required, full, children, hint, error }) {
  return (
    <div className={`venta-form__field${full ? ' venta-form__field--full' : ''}`}>
      <label className="venta-form__label">
        {label}
        {required && <span> *</span>}
      </label>
      {children}
      {hint && !error && <span className="venta-form__hint">{hint}</span>}
      {error && <span className="venta-form__field-error" role="alert">{error}</span>}
    </div>
  )
}

function inputClass(hasError) {
  return hasError ? 'venta-form__input venta-form__input--error' : 'venta-form__input'
}

function validateCertForm(form) {
  const errors = {}
  if (!form.cliente.trim()) errors.cliente = 'Ingresa el nombre completo del cliente.'
  if (!/^\d{8}$/.test(form.dni)) errors.dni = 'El DNI debe tener exactamente 8 dígitos numéricos.'
  if (!/^\d{9}$/.test(form.celular)) errors.celular = 'El celular debe tener exactamente 9 dígitos.'
  if (!form.correo.trim().includes('@')) {
    errors.correo = 'El correo debe incluir @ (ej. nombre@gmail.com).'
  }
  if (!form.fecha_venta) errors.fecha_venta = 'Indica la fecha de la venta.'
  if (!(/^\d+(\.\d{1,2})?$/.test(form.monto_total.trim()) && parseFloat(form.monto_total) > 0)) {
    errors.monto_total = 'El monto debe ser un número mayor a 0.'
  }
  if (!(/^\d+(\.\d{1,2})?$/.test(form.monto_depositado.trim()) && parseFloat(form.monto_depositado) > 0)) {
    errors.monto_depositado = 'El monto depositado debe ser un número mayor a 0.'
  }
  if (!form.operacion.trim()) errors.operacion = 'Ingresa el número de operación.'
  if (!form.entidad) errors.entidad = 'Selecciona la entidad financiera.'
  if (!form.cuotas) errors.cuotas = 'Selecciona una opción de cuotas.'
  if (!form.producto) errors.producto = 'Selecciona el tipo de producto.'
  if (!form.especialidad) errors.especialidad = 'Selecciona la especialidad.'
  if (!form.dni_receptor.trim()) errors.dni_receptor = 'Ingresa el DNI del receptor del documento.'
  if (!form.celular_receptor.trim()) errors.celular_receptor = 'Ingresa el celular del receptor del documento.'
  if (!form.tipo_documento) errors.tipo_documento = 'Selecciona el tipo de documento.'
  if (!form.fecha_documento) errors.fecha_documento = 'Selecciona la fecha de documento.'
  if (!form.horas) errors.horas = 'Selecciona las horas pedagógicas.'
  if (!form.tipo_envio) errors.tipo_envio = 'Selecciona el tipo de envío.'
  if (!form.validado_por) errors.validado_por = 'Selecciona quién valida el documento.'
  if (!form.codigo) errors.codigo = 'Selecciona el código (CON QR / SIN QR).'
  if (!form.departamento.trim()) errors.departamento = 'Indica departamento / provincia / distrito.'
  return errors
}

function FileUploadZone({ label, file, onChange, error, required = true }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const validateAndSet = (f) => {
    setLocalError('')
    if (!f) {
      onChange(null)
      return
    }
    if (!ACCEPT_TYPES.includes(f.type)) {
      setLocalError('Solo se permiten JPG, PNG, WEBP o PDF.')
      onChange(null)
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setLocalError('El archivo supera 8 MB.')
      onChange(null)
      return
    }
    onChange(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSet(f)
  }

  const zoneClass = [
    'venta-form__dropzone',
    dragging ? 'venta-form__dropzone--drag' : '',
    file ? 'venta-form__dropzone--filled' : '',
    error || localError ? 'venta-form__dropzone--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isPdf = file?.type === 'application/pdf'

  return (
    <div className="venta-form__upload">
      <label className="venta-form__label">
        {label}
        {required && <span> *</span>}
      </label>

      <div
        className={zoneClass}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!file) inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (!file && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={file ? -1 : 0}
        aria-label={label}
      >
        <input
          ref={inputRef}
          type="file"
          className="venta-form__dropzone-input"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={required && !file}
          onChange={(e) => validateAndSet(e.target.files?.[0] || null)}
        />

        {!file ? (
          <>
            <span className="venta-form__dropzone-icon" aria-hidden>📎</span>
            <p className="venta-form__dropzone-title">Arrastra el archivo aquí</p>
            <p className="venta-form__dropzone-text">
              Imagen (JPG, PNG, WEBP) o PDF · Máximo 8 MB
            </p>
            <button
              type="button"
              className="venta-form__dropzone-btn"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Elegir archivo
            </button>
          </>
        ) : (
          <div className="venta-form__file-preview">
            {preview ? (
              <img src={preview} alt="" className="venta-form__file-thumb" />
            ) : (
              <div className="venta-form__file-pdf" aria-hidden>PDF</div>
            )}
            <div className="venta-form__file-meta">
              <p className="venta-form__file-name">{file.name}</p>
              <p className="venta-form__file-size">
                {formatBytes(file.size)} · {isPdf ? 'Documento PDF' : 'Imagen'}
              </p>
              <div className="venta-form__file-actions">
                <button
                  type="button"
                  className="venta-form__file-link"
                  onClick={() => inputRef.current?.click()}
                >
                  Cambiar archivo
                </button>
                <button
                  type="button"
                  className="venta-form__file-remove"
                  onClick={() => {
                    validateAndSet(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(error || localError) && (
        <span className="venta-form__field-error" role="alert">{error || localError}</span>
      )}
    </div>
  )
}

function SubirCertificados() {
  const [form, setForm] = useState({ ...EMPTY_CERT_FORM })
  const [comprobante, setComprobante] = useState(null)
  const [dniCliente, setDniCliente] = useState(null)
  const [comprobanteError, setComprobanteError] = useState('')
  const [dniClienteError, setDniClienteError] = useState('')
  const [mencionError, setMencionError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [clienteLookup, setClienteLookup] = useState('idle')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const clearFieldErrors = (keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      keys.forEach((k) => delete next[k])
      return next
    })
  }

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'especialidad' && value !== prev.especialidad) {
        next.menciones = ''
      }
      return next
    })
    clearFieldError(key)
    setMessage('')
    setError('')
    if (key === 'especialidad') {
      setMencionError('')
    }
  }

  const setFechaHoy = () => {
    setForm((prev) => ({ ...prev, fecha_venta: todayISO() }))
    clearFieldError('fecha_venta')
    setMessage('')
    setError('')
  }

  const reset = () => {
    setForm({ ...EMPTY_CERT_FORM })
    setComprobante(null)
    setDniCliente(null)
    setComprobanteError('')
    setDniClienteError('')
    setMencionError('')
    setFieldErrors({})
    setClienteLookup('idle')
    setMessage('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    setComprobanteError('')
    setDniClienteError('')
    setMencionError('')

    const validationErrors = validateCertForm(form)
    if (!isClienteLookupReady(clienteLookup, form.dni)) {
      validationErrors.dni = 'Ingresa el DNI y espera la búsqueda (o pulsa Buscar).'
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError('Revisa los campos marcados antes de enviar.')
      setLoading(false)
      return
    }

    if (!comprobante) {
      setComprobanteError('Debes adjuntar el comprobante de pago.')
      setLoading(false)
      return
    }
    if (!dniCliente) {
      setDniClienteError('Debes adjuntar el DNI del cliente.')
      setLoading(false)
      return
    }
    if (!form.menciones.trim()) {
      setMencionError('Selecciona una mención de la lista.')
      setLoading(false)
      return
    }
    if (form.cuotas === '__OTRO__' && !form.cuotas_otro.trim()) {
      setError('Indica el detalle de cuotas en "Otro".')
      setLoading(false)
      return
    }
    if (form.fecha_documento === '__OTRO__' && !form.fecha_documento_otro.trim()) {
      setError('Indica la fecha de documento en "Otro".')
      setLoading(false)
      return
    }

    if (!getUser()) {
      setError('Sesión no iniciada. Cierra sesión e inicia de nuevo.')
      setLoading(false)
      return
    }

    try {
      setMessage('Subiendo archivos y guardando registro...')
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value ?? '')
      })
      body.append('comprobante', comprobante)
      body.append('dni_scan', dniCliente)

      const res = await submitFormData('dashboard/certificados/subir', body)

      if (res.data?.success) {
        setMessage(res.data.message || 'Certificado registrado correctamente.')
        setForm({ ...EMPTY_CERT_FORM })
        setComprobante(null)
        setDniCliente(null)
        setComprobanteError('')
        setDniClienteError('')
      } else {
        setError(res.data?.error || 'No se pudo registrar el certificado.')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Sesión expirada o sin token. Cierra sesión, vuelve a entrar y reinicia frontend + backend.')
        return
      }
      if (!err.response) {
        setError(err.message || 'No se pudo conectar con el backend.')
        return
      }
      const detail = err.response?.data?.detail
      const detailMsg = Array.isArray(detail)
        ? detail.map((d) => d.msg).join(', ')
        : detail
      setError(err.response?.data?.error || detailMsg || 'Error al enviar el formulario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="venta-form">
      <header className="venta-form__header">
        <h1>Subir certificados</h1>
        <p>
          Registra una venta de certificado. Todos los campos son obligatorios, excepto
          observaciones y otras menciones.
        </p>
      </header>

      <form className="venta-form__card" onSubmit={handleSubmit} noValidate>
        {loading && (
          <div className="venta-form__overlay" role="status" aria-live="polite">
            <div className="venta-form__overlay-spinner" aria-hidden="true" />
            <p className="venta-form__overlay-text">Subiendo archivos y guardando registro...</p>
          </div>
        )}
        <fieldset className="venta-form__fieldset" disabled={loading}>
        <div className="venta-form__grid">
          <h2 className="venta-form__section-title">Datos del cliente</h2>

          <div className="venta-form__field--full">
            <ClienteLookupSection
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              onClearFieldError={clearFieldError}
              onClearFieldErrors={clearFieldErrors}
              onLookupChange={setClienteLookup}
              productLabel="certificado"
            />
          </div>

          <h2 className="venta-form__section-title venta-form__section-title--spaced">Montos y pago</h2>

          <Field label="Fecha de la venta" required error={fieldErrors.fecha_venta}>
            <div className="venta-form__date-row">
              <input
                type="date"
                className={inputClass(fieldErrors.fecha_venta)}
                value={form.fecha_venta}
                onChange={set('fecha_venta')}
                required
              />
              <button
                type="button"
                className="venta-form__btn venta-form__btn--ghost venta-form__btn--today"
                onClick={setFechaHoy}
              >
                Hoy
              </button>
            </div>
          </Field>

          <Field label="Monto de la venta (S/)" required error={fieldErrors.monto_total}>
            <input className={inputClass(fieldErrors.monto_total)} value={form.monto_total} onChange={set('monto_total')} required inputMode="decimal" placeholder="0.00" />
          </Field>

          <Field label="Monto depositado (S/)" required error={fieldErrors.monto_depositado}>
            <input className={inputClass(fieldErrors.monto_depositado)} value={form.monto_depositado} onChange={set('monto_depositado')} required inputMode="decimal" placeholder="0.00" />
          </Field>

          <Field label="Número de operación" required error={fieldErrors.operacion}>
            <input className={inputClass(fieldErrors.operacion)} value={form.operacion} onChange={set('operacion')} required inputMode="numeric" />
          </Field>

          <Field label="Entidad financiera" required error={fieldErrors.entidad}>
            <select className={inputClass(fieldErrors.entidad)} value={form.entidad} onChange={set('entidad')} required>
              <option value="">Seleccionar...</option>
              {ENTIDADES_FINANCIERAS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Cuotas" required error={fieldErrors.cuotas}>
            <select className={inputClass(fieldErrors.cuotas)} value={form.cuotas} onChange={set('cuotas')} required>
              <option value="">Seleccionar...</option>
              {CUOTAS_OPCIONES.map((op) => {
                const value = typeof op === 'string' ? op : op.value
                const label = typeof op === 'string' ? op : op.label
                return <option key={value} value={value}>{label}</option>
              })}
            </select>
          </Field>

          {form.cuotas === '__OTRO__' && (
            <Field label="Detalle de cuotas (otro)" required full>
              <input className="venta-form__input" value={form.cuotas_otro} onChange={set('cuotas_otro')} placeholder="Escribe el detalle..." required />
            </Field>
          )}

          <FileUploadZone
            label="Comprobante de pago"
            file={comprobante}
            onChange={(f) => {
              setComprobante(f)
              setComprobanteError('')
            }}
            error={comprobanteError}
          />

          <Field label="Tipo de producto" required error={fieldErrors.producto}>
            <select className={inputClass(fieldErrors.producto)} value={form.producto} onChange={set('producto')} required>
              <option value="">Seleccionar...</option>
              {TIPOS_PRODUCTO.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Especialidad" required error={fieldErrors.especialidad}>
            <select className={inputClass(fieldErrors.especialidad)} value={form.especialidad} onChange={set('especialidad')} required>
              <option value="">Seleccionar...</option>
              {ESPECIALIDADES.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Observaciones" full hint="Opcional">
            <input className="venta-form__input" value={form.observaciones} onChange={set('observaciones')} placeholder="Opcional" />
          </Field>

          <h2 className="venta-form__section-title venta-form__section-title--spaced">Datos del documento</h2>

          <Field label="DNI del receptor del documento" required error={fieldErrors.dni_receptor}>
            <input className={inputClass(fieldErrors.dni_receptor)} value={form.dni_receptor} onChange={set('dni_receptor')} required inputMode="numeric" maxLength={12} />
          </Field>

          <Field label="Celular del receptor del documento" required error={fieldErrors.celular_receptor}>
            <input className={inputClass(fieldErrors.celular_receptor)} value={form.celular_receptor} onChange={set('celular_receptor')} required inputMode="tel" />
          </Field>

          <Field label="Tipo de documento" required error={fieldErrors.tipo_documento}>
            <select className={inputClass(fieldErrors.tipo_documento)} value={form.tipo_documento} onChange={set('tipo_documento')} required>
              <option value="">Seleccionar...</option>
              {TIPOS_DOCUMENTO.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Fecha de documento" required error={fieldErrors.fecha_documento}>
            <select className={inputClass(fieldErrors.fecha_documento)} value={form.fecha_documento} onChange={set('fecha_documento')} required>
              <option value="">Seleccionar...</option>
              {FECHAS_DOCUMENTO.map((op) => {
                const value = typeof op === 'string' ? op : op.value
                const label = typeof op === 'string' ? op : op.label
                return <option key={value} value={value}>{label}</option>
              })}
            </select>
          </Field>

          {form.fecha_documento === '__OTRO__' && (
            <Field label="Fecha de documento (otro)" required full>
              <input className="venta-form__input" value={form.fecha_documento_otro} onChange={set('fecha_documento_otro')} placeholder="Ej. AGOSTO 2025" required />
            </Field>
          )}

          <Field label="Horas pedagógicas" required error={fieldErrors.horas}>
            <select className={inputClass(fieldErrors.horas)} value={form.horas} onChange={set('horas')} required>
              <option value="">Seleccionar...</option>
              {HORAS_PEDAGOGICAS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de envío" required error={fieldErrors.tipo_envio}>
            <select className={inputClass(fieldErrors.tipo_envio)} value={form.tipo_envio} onChange={set('tipo_envio')} required>
              <option value="">Seleccionar...</option>
              {TIPOS_ENVIO.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Validado por" required error={fieldErrors.validado_por}>
            <select className={inputClass(fieldErrors.validado_por)} value={form.validado_por} onChange={set('validado_por')} required>
              <option value="">Seleccionar...</option>
              {VALIDADO_POR_OPCIONES.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Código" required error={fieldErrors.codigo}>
            <select className={inputClass(fieldErrors.codigo)} value={form.codigo} onChange={set('codigo')} required>
              <option value="">Seleccionar...</option>
              {CODIGO_OPCIONES.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <MencionPicker
            value={form.menciones}
            onChange={(mencion) => {
              setForm((prev) => ({ ...prev, menciones: mencion }))
              setMencionError('')
              setMessage('')
              setError('')
            }}
            especialidad={form.especialidad}
            error={mencionError}
            required
          />

          <Field label="Otras menciones" full hint="Opcional">
            <input className="venta-form__input" value={form.otras_menciones} onChange={set('otras_menciones')} placeholder="Opcional" />
          </Field>

          <Field label="Departamento / Provincia / Distrito" required full error={fieldErrors.departamento}>
            <input className={inputClass(fieldErrors.departamento)} value={form.departamento} onChange={set('departamento')} required placeholder="Ej. Lima / Lima / Miraflores" />
          </Field>

          <FileUploadZone
            label="DNI del cliente (imagen o PDF)"
            file={dniCliente}
            onChange={(f) => {
              setDniCliente(f)
              setDniClienteError('')
            }}
            error={dniClienteError}
          />
        </div>

        <div className="venta-form__actions">
          <button type="submit" className="venta-form__btn venta-form__btn--primary" disabled={loading}>
            {loading ? 'Subiendo archivos y guardando...' : 'Registrar certificado'}
          </button>
          <button type="button" className="venta-form__btn venta-form__btn--ghost" onClick={reset} disabled={loading}>
            Limpiar
          </button>
        </div>
        </fieldset>

        {message && <div className="venta-form__success" role="status">{message}</div>}
        {error && <div className="venta-form__error" role="alert">{error}</div>}
      </form>
    </div>
  )
}

export default SubirCertificados
