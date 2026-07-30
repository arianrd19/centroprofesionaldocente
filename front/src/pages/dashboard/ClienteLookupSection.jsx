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
 * - Encontrado: autocompleta y bloquea nombre/celular; correo se precarga pero queda editable.
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
  // Si el cliente ya está en CLIENTES pero le falta nombre o celular, se deja
  // editable para que el asesor lo complete (y quede guardado al enviar).
  const nombreLocked = isLocked && !!form.cliente
  const celularLocked = isLocked && !!form.celular

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
        correo: mapped.correo,
      }))
      setLookup('found')
      onClearFieldErrors?.(['cliente', 'celular', 'correo', 'dni'])
    } catch (err) {
      if (err.response?.status === 404) {
        clearClienteFields()
        setLookup('not_found')
        onClearFieldErrors?.(['dni'])
        buscarNombreEnReniec(dniVal)
      } else {
        clearClienteFields()
        setLookup('error')
      }
    } finally {
      setBuscando(false)
    }
  }

  /** Cliente nuevo (no está en CLIENTES): intenta autocompletar el nombre desde RENIEC. */
  const buscarNombreEnReniec = async (dniVal) => {
    try {
      const res = await api.get(`dashboard/dni-externo/${dniVal}`)
      setForm((prev) => (prev.dni === dniVal ? { ...prev, cliente: res.data.nombreCompleto || prev.cliente } : prev))
    } catch {
      // Sin datos en RENIEC o token no configurado: se completa el nombre a mano.
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
      text: 'Datos cargados desde CLIENTES. Revisa el correo antes de enviar.',
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
      {lookup === 'searching' && (
        <div className="venta-form__cliente-overlay" role="status" aria-live="polite">
          <div className="venta-form__cliente-overlay-spinner" aria-hidden="true" />
          <p className="venta-form__cliente-overlay-text">Buscando cliente en CLIENTES...</p>
        </div>
      )}
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
              disabled={buscando}
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
            className={inputClass(fieldErrors.cliente, nombreLocked)}
            value={form.cliente}
            onChange={setField('cliente')}
            required
            autoComplete="name"
            readOnly={nombreLocked}
            disabled={fieldsDisabled}
            placeholder={nombreLocked ? '' : 'Nombre y apellidos'}
          />
        </Field>

        <Field
          label="Celular del cliente"
          required
          hint={fieldsDisabled ? undefined : '9 dígitos'}
          error={fieldErrors.celular}
        >
          <input
            className={inputClass(fieldErrors.celular, celularLocked)}
            value={form.celular}
            onChange={setCelular}
            required
            inputMode="numeric"
            maxLength={9}
            readOnly={celularLocked}
            disabled={fieldsDisabled}
            placeholder={celularLocked ? '' : '987654321'}
          />
        </Field>

        <Field
          label="Correo del cliente"
          required
          hint={fieldsDisabled ? 'Primero busca el DNI' : 'Debe incluir @'}
          error={fieldErrors.correo}
        >
          <input
            type="text"
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
