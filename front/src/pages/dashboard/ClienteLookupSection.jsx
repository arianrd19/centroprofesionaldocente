import { useEffect, useRef, useState } from 'react'
import api from '../../utils/api'
import { digitsOnly, isValidDni, mapClienteFromSheet } from '../../utils/clienteLookup'

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

function inputClass(hasError, locked) {
  const parts = ['venta-form__input']
  if (hasError) parts.push('venta-form__input--error')
  if (locked) parts.push('venta-form__input--locked')
  return parts.join(' ')
}

/**
 * Bloque DNI + datos del cliente con búsqueda en hoja CLIENTES.
 * - Encontrado: autocompleta y bloquea nombre/celular; correo siempre editable (no está en CLIENTES).
 * - No encontrado: habilita edición manual (se crea en CLIENTES al guardar la venta/certificado).
 */
export default function ClienteLookupSection({
  form,
  setForm,
  fieldErrors = {},
  onClearFieldError,
  onClearFieldErrors,
  onLookupChange,
  dniError,
  productLabel = 'venta',
}) {
  const [buscando, setBuscando] = useState(false)
  const [lookup, setLookup] = useState('idle')
  const searchRef = useRef(null)

  const isLocked = lookup === 'found'
  const canEditManual = lookup === 'not_found' || lookup === 'error'
  const fieldsDisabled = !isLocked && !canEditManual

  useEffect(() => () => {
    if (searchRef.current) clearTimeout(searchRef.current)
  }, [])

  const clearClienteFields = () => {
    setForm((prev) => ({ ...prev, cliente: '', celular: '', correo: '' }))
  }

  const buscarPorDni = async (dni) => {
    const dniVal = digitsOnly(String(dni || ''), 8)
    if (!isValidDni(dniVal)) {
      setLookup('idle')
      return
    }

    setBuscando(true)
    setLookup('searching')
    try {
      const res = await api.get(`dashboard/clientes/${dniVal}`)
      const mapped = mapClienteFromSheet(res.data)
      setForm((prev) => ({
        ...prev,
        cliente: mapped.cliente,
        dni: mapped.dni,
        celular: mapped.celular,
        correo: '',
      }))
      setLookup('found')
      onClearFieldErrors?.(['cliente', 'celular', 'correo', 'dni'])
    } catch (err) {
      if (err.response?.status === 404) {
        clearClienteFields()
        setLookup('not_found')
        onClearFieldErrors?.(['dni'])
      } else {
        clearClienteFields()
        setLookup('error')
      }
    } finally {
      setBuscando(false)
    }
  }

  const handleDniChange = (e) => {
    const dni = digitsOnly(e.target.value, 8)
    setForm((prev) => ({ ...prev, dni }))
    onClearFieldError?.('dni')
    setLookup('idle')
    clearClienteFields()

    if (searchRef.current) clearTimeout(searchRef.current)
    if (dni.length === 8) {
      searchRef.current = setTimeout(() => buscarPorDni(dni), 500)
    }
  }

  const setCelular = (e) => {
    setForm((prev) => ({ ...prev, celular: digitsOnly(e.target.value, 9) }))
    onClearFieldError?.('celular')
  }

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    onClearFieldError?.(key)
  }

  const statusConfig = {
    idle: {
      className: 'venta-form__cliente-card--idle',
      icon: '🔍',
      title: 'Busca al cliente por DNI',
      text: 'Ingresa 8 dígitos. Si está en CLIENTES, cargamos sus datos automáticamente.',
    },
    searching: {
      className: 'venta-form__cliente-card--searching',
      icon: '⏳',
      title: 'Buscando en CLIENTES...',
      text: 'Un momento.',
    },
    found: {
      className: 'venta-form__cliente-card--found',
      icon: '✓',
      title: 'Cliente registrado',
      text: 'Nombre y celular cargados desde CLIENTES. Completa el correo antes de enviar.',
    },
    not_found: {
      className: 'venta-form__cliente-card--new',
      icon: '✎',
      title: 'Cliente nuevo',
      text: `No está en CLIENTES. Completa nombre, celular y correo; se guardará al registrar ${productLabel === 'certificado' ? 'el certificado' : 'la venta'}.`,
    },
    error: {
      className: 'venta-form__cliente-card--error',
      icon: '!',
      title: 'No se pudo consultar CLIENTES',
      text: 'Completa los datos manualmente o pulsa Buscar de nuevo.',
    },
  }

  const status = statusConfig[lookup] || statusConfig.idle

  useEffect(() => {
    onLookupChange?.(lookup)
  }, [lookup, onLookupChange])

  useEffect(() => {
    if (!form.dni) setLookup('idle')
  }, [form.dni])

  return (
    <div className={`venta-form__cliente-card ${status.className}`}>
      <div className="venta-form__cliente-status" role="status">
        <span className="venta-form__cliente-status-icon" aria-hidden>{status.icon}</span>
        <div>
          <strong>{status.title}</strong>
          <p>{status.text}</p>
        </div>
      </div>

      <div className="venta-form__cliente-fields">
        <Field
          label="DNI del cliente"
          required
          full
          hint="8 dígitos numéricos"
          error={dniError || fieldErrors.dni}
        >
          <div className="venta-form__date-row">
            <input
              className={inputClass(dniError || fieldErrors.dni, false)}
              value={form.dni}
              onChange={handleDniChange}
              required
              inputMode="numeric"
              maxLength={8}
              placeholder="12345678"
              autoComplete="off"
            />
            <button
              type="button"
              className="venta-form__btn venta-form__btn--ghost venta-form__btn--today"
              onClick={() => buscarPorDni(form.dni)}
              disabled={buscando || form.dni.length !== 8}
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
        </Field>

        <Field
          label="Nombre completo del cliente"
          required
          error={fieldErrors.cliente}
          hint={fieldsDisabled ? 'Primero busca el DNI' : undefined}
        >
          <input
            className={inputClass(fieldErrors.cliente, isLocked)}
            value={form.cliente}
            onChange={setField('cliente')}
            required
            autoComplete="name"
            readOnly={isLocked}
            disabled={fieldsDisabled}
            placeholder={canEditManual ? 'Nombre y apellidos' : ''}
          />
        </Field>

        <Field
          label="Celular del cliente"
          required
          hint={fieldsDisabled ? undefined : '9 dígitos'}
          error={fieldErrors.celular}
        >
          <input
            className={inputClass(fieldErrors.celular, isLocked)}
            value={form.celular}
            onChange={setCelular}
            required
            inputMode="numeric"
            maxLength={9}
            readOnly={isLocked}
            disabled={fieldsDisabled}
            placeholder={canEditManual ? '987654321' : ''}
          />
        </Field>

        <Field
          label="Correo del cliente"
          required
          hint={
            fieldsDisabled
              ? 'Primero busca el DNI'
              : 'Debe incluir @ y .com — no está en la hoja CLIENTES'
          }
          error={fieldErrors.correo}
        >
          <input
            type="email"
            className={inputClass(fieldErrors.correo, false)}
            value={form.correo}
            onChange={setField('correo')}
            required
            autoComplete="email"
            disabled={fieldsDisabled}
            placeholder="nombre@gmail.com"
          />
        </Field>
      </div>
    </div>
  )
}

export { Field, inputClass }
