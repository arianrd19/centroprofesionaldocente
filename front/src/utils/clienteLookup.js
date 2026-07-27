export function digitsOnly(value, maxLen) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

export function isValidDni(dni) {
  return /^\d{8}$/.test(dni)
}

export function mapClienteFromSheet(cliente) {
  const nombre = cliente['NOMBRE COMPLETO DEL CLIENTE'] || cliente.NOMBRES || cliente.nombres || ''
  const dni = cliente['DNI DEL CLIENTE'] || cliente.DNI || cliente.dni || ''
  const celular = digitsOnly(
    String(cliente['CELULAR DEL CLIENTE'] || cliente.telefono || cliente.TELEFONO || ''),
    9,
  )
  const correo = (cliente['CORREO DEL CLIENTE'] || cliente.email || cliente.EMAIL || '').trim()
  return {
    cliente: nombre.trim(),
    dni: digitsOnly(String(dni), 8),
    celular,
    correo,
  }
}

/** Debe haber buscado el DNI (encontrado o cliente nuevo) antes de enviar. */
export function isClienteLookupReady(lookupState, dni) {
  if (!isValidDni(dni)) return false
  return lookupState === 'found' || lookupState === 'not_found'
}
