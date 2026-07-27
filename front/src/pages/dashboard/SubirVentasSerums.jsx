import { useState } from 'react'
import { submitFormData } from '../../utils/submitFormData'
import { isClienteLookupReady } from '../../utils/clienteLookup'
import ClienteLookupSection from './ClienteLookupSection'
import ComprobanteUpload from './ComprobanteUpload'
import {
  CUOTAS_OPCIONES,
  EMPTY_SERUMS_FORM,
  ENTIDADES_FINANCIERAS,
  ESPECIALIDAD_TM,
  ESPECIALIDADES_SERUMS,
  OBSERVACIONES_OPCIONES,
  SUB_ESPECIALIDADES_TM,
  validateSerumsForm,
} from './subirSerumsOptions'
import './SubirVentas.css'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function SubirVentasSerums() {
  const [form, setForm] = useState({ ...EMPTY_SERUMS_FORM })
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

  const setEspecialidad = (e) => {
    const value = e.target.value
    setForm((prev) => ({
      ...prev,
      especialidad: value,
      sub_especialidad: value === ESPECIALIDAD_TM ? '' : 'NO APLICA',
    }))
    clearFieldErrors(['especialidad', 'sub_especialidad'])
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
    setForm({ ...EMPTY_SERUMS_FORM })
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

    const validationErrors = validateSerumsForm(form)
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

    const subEspecialidad = form.especialidad === ESPECIALIDAD_TM
      ? form.sub_especialidad
      : 'NO APLICA'

    try {
      const body = new FormData()
      Object.entries({ ...form, sub_especialidad: subEspecialidad }).forEach(([key, value]) => {
        body.append(key, value ?? '')
      })
      body.append('comprobante', comprobante)

      const res = await submitFormData('dashboard/serums/subir', body)

      if (res.data?.success) {
        setMessage(res.data.message || 'Venta SERUMS registrada correctamente.')
        setForm({ ...EMPTY_SERUMS_FORM })
        setComprobante(null)
        setFieldErrors({})
        setClienteLookup('idle')
      } else {
        setError(res.data?.error || 'No se pudo registrar la venta SERUMS.')
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
        <h1>Subir ventas SERUMS</h1>
        <p>Registra una nueva venta SERUMS. Todos los campos son obligatorios, excepto observaciones.</p>
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

          <h2 className="venta-form__section-title venta-form__section-title--spaced">Especialidad</h2>

          <Field label="Especialidad" required error={fieldErrors.especialidad}>
            <select
              className={inputClass(fieldErrors.especialidad)}
              value={form.especialidad}
              onChange={setEspecialidad}
              required
            >
              <option value="">Seleccionar...</option>
              {ESPECIALIDADES_SERUMS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>

          {form.especialidad === ESPECIALIDAD_TM && (
            <Field
              label="Sub especialidad de tecnología médica"
              required
              full
              error={fieldErrors.sub_especialidad}
            >
              <select
                className={inputClass(fieldErrors.sub_especialidad)}
                value={form.sub_especialidad}
                onChange={set('sub_especialidad')}
                required
              >
                <option value="">Seleccionar...</option>
                {SUB_ESPECIALIDADES_TM.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </Field>
          )}

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
            {loading ? 'Guardando...' : 'Registrar venta SERUMS'}
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

export default SubirVentasSerums
