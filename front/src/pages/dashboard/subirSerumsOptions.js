export {
  CUOTAS_OPCIONES,
  ENTIDADES_FINANCIERAS,
  OBSERVACIONES_OPCIONES,
} from './subirVentasOptions'

export const ESPECIALIDAD_TM = '07.TECNOLOGIA MEDICA'

export const ESPECIALIDADES_SERUMS = [
  '01.MEDICINA',
  '02.ODONTOLOGIA',
  '03.ENFERMERIA',
  '04.OBSTETRICIA',
  '05.FARMACIA Y BIOQUIMICA',
  '06.NUTRICION',
  '07.TECNOLOGIA MEDICA',
  '08.TRABAJO SOCIAL',
  '09.BIOLOGIA',
  '10.PSICOLOGIA',
  '11.VETERINARIA',
  '12.INGENIERÍA SANITARIA',
]

export const SUB_ESPECIALIDADES_TM = [
  '07.1 - LABORATORIO CLINICO',
  '07.2 - OPTOMETRIA',
  '07.3 - RADIOLOGÍA',
  '07.4 - TERAPIA DE LENGUAJE',
  '07.5 - TERAPIA FÍSICA',
  '07.6 - TERAPIA OCUPACIONAL',
]

export const EMPTY_SERUMS_FORM = {
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
  especialidad: '',
  sub_especialidad: '',
  observaciones: '',
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

export function validateSerumsForm(form) {
  const errors = {}
  if (!isValidDni(form.dni)) errors.dni = 'El DNI debe tener exactamente 8 dígitos numéricos.'
  if (!isValidCelular(form.celular)) errors.celular = 'El celular debe tener exactamente 9 dígitos.'
  if (!isValidCorreo(form.correo)) errors.correo = 'El correo debe incluir @ y .com (ej. nombre@gmail.com).'
  if (!form.fecha_venta) errors.fecha_venta = 'Indica la fecha de la venta.'
  if (!isValidMonto(form.monto_total)) errors.monto_total = 'El monto total debe ser un número mayor a 0.'
  if (!isValidMonto(form.monto_depositado)) errors.monto_depositado = 'El monto depositado debe ser un número mayor a 0.'
  if (!isValidOperacion(form.operacion)) errors.operacion = 'El número de operación solo puede contener letras y números.'
  if (!form.especialidad) errors.especialidad = 'Selecciona una especialidad.'
  if (form.especialidad === ESPECIALIDAD_TM && !form.sub_especialidad) {
    errors.sub_especialidad = 'Selecciona la sub especialidad de tecnología médica.'
  }
  return errors
}
