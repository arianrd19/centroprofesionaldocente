export {
  ENTIDADES_FINANCIERAS,
  CUOTAS_OPCIONES,
  TIPOS_PRODUCTO,
  ESPECIALIDADES,
} from './subirVentasOptions'

export const TIPOS_DOCUMENTO = [
  'CERTIFICADO',
  'DIPLOMADO',
  'ESPECIALIZACIÓN',
  'DIPLOMADO + ESPECIALIZACIÓN + CERTIFCADO',
]

export const FECHAS_DOCUMENTO = [
  'MARZO 2025',
  'MAYO 2025',
  'OCTUBRE 2025',
  'JULIO 2025',
  { value: '__OTRO__', label: 'Otro' },
]

export const HORAS_PEDAGOGICAS = [
  '120 H',
  '160 H',
  '200 H',
  '250 H',
  '300 H',
  '350 H',
  '1200 H',
]

export const TIPOS_ENVIO = [
  'ENVIO FISICO + ENVIO VIRTUAL',
  'ENVIO VIRTUAL',
]

export const VALIDADO_POR_OPCIONES = [
  'UNIVERSIDAD NACIONAL SANTIAGO ANTUNEZ DE MAYOLO (HUARAZ)',
  'UNVIERSIDAD NACIONAL SAN LUIS GONZAGA (ICA)',
  'INSTITUTO SUPERIOR DE PEDAGOGÍA DE LA LIBERTAD',
]

export const CODIGO_OPCIONES = ['CON QR', 'SIN QR']

export const EMPTY_CERT_FORM = {
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
  dni_receptor: '',
  celular_receptor: '',
  tipo_documento: '',
  fecha_documento: '',
  fecha_documento_otro: '',
  horas: '',
  tipo_envio: '',
  validado_por: '',
  codigo: '',
  menciones: '',
  otras_menciones: '',
  departamento: '',
}
