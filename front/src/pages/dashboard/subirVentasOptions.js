export const ENTIDADES_FINANCIERAS = [
  'BCP',
  'INTERBANK',
  'BBVA',
  'BN - FLAVIO ALFARO',
  'BN - DIANA ALFARO',
  'SCOTIABANK',
  'YAPE / CENTRO PROFESIONAL DOCENTE',
  'YAPE/ FLAVIO ALFARO',
  'PLIN / FLAVIO ALFARO',
]

export const CUOTAS_OPCIONES = [
  'CUOTA 1',
  'CUOTA 2',
  'CUOTA FINAL',
  'AL CONTADO',
  { value: '__OTRO__', label: 'Otro' },
]

export const TIPOS_PRODUCTO = [
  'CARGOS DIRECTIVOS 2026 - ABR',
  'NOMBRAMIENTO 2026 - ABR',
  'ASCENSO 2026 - ABR',
  'ASCENSO + CARGOS DIRECTIVOS 2026',
]

export const ESPECIALIDADES = [
  'INICIAL',
  'PRIMARIA',
  'MATEMÁTICA',
  'CYT',
  'EDUCACIÓN FISICA',
  'ARTE Y CULTURA',
  'COMUNICACIÓN',
  'CIENCIA SOCIALES',
  'EPT',
  'EBE',
  'AIP',
  'DPCC',
  'INGLÉS',
]

export const OBSERVACIONES_OPCIONES = [
  'DESCUENTO',
  'DESCUENTO POR REFERIDO',
  'GRABACIONES',
  'RECOMPRA',
]

export const EMPTY_FORM = {
  cliente: '',
  dni: '',
  celular: '',
  correo: '',
  fecha_venta: '',
  monto_total: '',
  monto_depositado: '',
  operacion: '',
  entidad: '',
  cuotas: '',
  cuotas_otro: '',
  producto: '',
  especialidad: '',
  observaciones: '',
}
