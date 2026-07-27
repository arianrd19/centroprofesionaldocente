import { useState } from 'react'
import { submitFormData } from '../../utils/submitFormData'
import { isClienteLookupReady } from '../../utils/clienteLookup'
import ClienteLookupSection from './ClienteLookupSection'
import ComprobanteUpload from './ComprobanteUpload'
import {
  CUOTAS_OPCIONES,
  EMPTY_FORM,
  ENTIDADES_FINANCIERAS,
  ESPECIALIDADES,
  OBSERVACIONES_OPCIONES,
  TIPOS_PRODUCTO,
} from './subirVentasOptions'
import './SubirVentas.css'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function digitsOnly(value, maxLen) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

function numericAmount(value) {
  let v = value.replace(/[^\d.]/g, '')
  const dot = v.indexOf('.')
  if (dot !== -1) {
    v = `${v.slice(0, dot + 1)}${v.slice(dot + 1).replace(/\./g, '')}`
  }
  return v
}

function alphanumeric(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}

function isValidDni(dni) {
  return /^\d{8}$/.test(dni)
}

function isValidCelular(celular) {
  return /^\d{9}$/.test(celular)
}

function isValidCorreo(correo) {
  const c = correo.trim()
  return c.includes('@') && /\.com/i.test(c)
}

function isValidMonto(monto) {
  const v = monto.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return false
  return parseFloat(v) > 0
}

function isValidOperacion(operacion) {
  return /^[a-zA-Z0-9]+$/.test(operacion.trim())
}

function validateVentaForm(form) {
  const errors = {}
  if (!isValidDni(form.dni)) errors.dni = 'El DNI debe tener exactamente 8 dígitos numéricos.'
  if (!isValidCelular(form.celular)) errors.celular = 'El celular debe tener exactamente 9 dígitos.'
  if (!isValidCorreo(form.correo)) errors.correo = 'El correo debe incluir @ y .com (ej. nombre@gmail.com).'
  if (!form.fecha_venta) errors.fecha_venta = 'Indica la fecha de la venta.'
  if (!isValidMonto(form.monto_total)) errors.monto_total = 'El monto total debe ser un número mayor a 0 (ej. 150 o 150.50).'
  if (!isValidMonto(form.monto_depositado)) errors.monto_depositado = 'El monto depositado debe ser un número mayor a 0.'
  if (!isValidOperacion(form.operacion)) errors.operacion = 'El número de operación solo puede contener letras y números.'
  return errors
}

function inputClass(hasError) {
  return hasError ? 'venta-form__input venta-form__input--error' : 'venta-form__input'
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

function SubirVentas() {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [comprobante, setComprobante] = useState(null)
  const [comprobanteError, setComprobanteError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [clienteLookup, setClienteLookup] = useState('idle')

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
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    clearFieldError(key)
    setMessage('')
    setError('')
  }

  const setMonto = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: numericAmount(e.target.value) }))
    clearFieldError(key)
    setMessage('')
    setError('')
  }

  const setOperacion = (e) => {
    setForm((prev) => ({ ...prev, operacion: alphanumeric(e.target.value) }))
    clearFieldError('operacion')
    setMessage('')
    setError('')
  }

  const setFechaHoy = () => {
    setForm((prev) => ({ ...prev, fecha_venta: todayISO() }))
    clearFieldError('fecha_venta')
    setMessage('')
    setError('')
  }

  const reset = () => {
    setForm({ ...EMPTY_FORM })
    setComprobante(null)
    setComprobanteError('')
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

    const validationErrors = validateVentaForm(form)
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

    if (form.cuotas === '__OTRO__' && !form.cuotas_otro.trim()) {
      setError('Indica el detalle de cuotas en "Otro".')
      setLoading(false)
      return
    }

    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value ?? '')
      })
      body.append('comprobante', comprobante)

      const res = await submitFormData('dashboard/ventas/subir', body)

      if (res.data?.success) {
        setMessage(res.data.message || 'Venta registrada correctamente.')
        setForm({ ...EMPTY_FORM })
        setComprobante(null)
        setFieldErrors({})
      } else {
        setError(res.data?.error || 'No se pudo registrar la venta.')
      }
    } catch (err) {
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
        <h1>Subir ventas</h1>
        <p>Registra una nueva venta de curso. Todos los campos son obligatorios, excepto observaciones.</p>
      </header>

      <form className="venta-form__card" onSubmit={handleSubmit} noValidate>
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

          <Field label="Monto total de la venta (S/)" required error={fieldErrors.monto_total}>
            <input
              className={inputClass(fieldErrors.monto_total)}
              value={form.monto_total}
              onChange={setMonto('monto_total')}
              required
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field label="Monto depositado (S/)" required error={fieldErrors.monto_depositado}>
            <input
              className={inputClass(fieldErrors.monto_depositado)}
              value={form.monto_depositado}
              onChange={setMonto('monto_depositado')}
              required
              inputMode="decimal"
              placeholder="0.00"
            />
          </Field>

          <Field
            label="Número de operación"
            required
            hint="Letras y números"
            error={fieldErrors.operacion}
          >
            <input
              className={inputClass(fieldErrors.operacion)}
              value={form.operacion}
              onChange={setOperacion}
              required
              inputMode="text"
              placeholder="ABC123456"
            />
          </Field>

          <Field label="Entidad financiera" required>
            <select className="venta-form__select" value={form.entidad} onChange={set('entidad')} required>
              <option value="">Seleccionar...</option>
              {ENTIDADES_FINANCIERAS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Cuotas" required>
            <select className="venta-form__select" value={form.cuotas} onChange={set('cuotas')} required>
              <option value="">Seleccionar...</option>
              {CUOTAS_OPCIONES.map((op) => {
                const value = typeof op === 'string' ? op : op.value
                const label = typeof op === 'string' ? op : op.label
                return (
                  <option key={value} value={value}>{label}</option>
                )
              })}
            </select>
          </Field>

          {form.cuotas === '__OTRO__' && (
            <Field label="Detalle de cuotas (otro)" required full>
              <input
                className="venta-form__input"
                value={form.cuotas_otro}
                onChange={set('cuotas_otro')}
                placeholder="Escribe el detalle..."
                required
              />
            </Field>
          )}

          <ComprobanteUpload
            file={comprobante}
            onChange={(f) => {
              setComprobante(f)
              setComprobanteError('')
            }}
            error={comprobanteError}
          />

          <h2 className="venta-form__section-title venta-form__section-title--spaced">Producto</h2>

          <Field label="Tipo de producto" required>
            <select className="venta-form__select" value={form.producto} onChange={set('producto')} required>
              <option value="">Seleccionar...</option>
              {TIPOS_PRODUCTO.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Especialidad" required>
            <select className="venta-form__select" value={form.especialidad} onChange={set('especialidad')} required>
              <option value="">Seleccionar...</option>
              {ESPECIALIDADES.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          <Field label="Observaciones" full hint="Opcional">
            <select className="venta-form__select" value={form.observaciones} onChange={set('observaciones')}>
              <option value="">Ninguna</option>
              {OBSERVACIONES_OPCIONES.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="venta-form__actions">
          <button type="submit" className="venta-form__btn venta-form__btn--primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar venta'}
          </button>
          <button type="button" className="venta-form__btn venta-form__btn--ghost" onClick={reset} disabled={loading}>
            Limpiar
          </button>
        </div>

        {message && <div className="venta-form__success" role="status">{message}</div>}
        {error && <div className="venta-form__error" role="alert">{error}</div>}
      </form>
    </div>
  )
}

export default SubirVentas
