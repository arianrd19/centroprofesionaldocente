import gspread
from typing import List, Dict, Optional
from app.core.config import settings
from app.core.google_credentials import load_service_account_credentials
import os
import traceback
from datetime import datetime, timedelta


class GoogleSheetsService:
    def __init__(self):
        self.client = None
        self.sheet = None
        self.spreadsheets = {}  # Cache de spreadsheets abiertos
        # Cache de datos con expiración
        self._cache_menciones = None
        self._cache_menciones_timestamp = None
        self._cache_clientes = None
        self._cache_clientes_timestamp = None
        self._cache_ttl = timedelta(minutes=5)  # Cache válido por 5 minutos
        self._connect()
    
    def _connect(self):
        """Conecta a Google Sheets usando la cuenta de servicio unificada."""
        try:
            creds = load_service_account_credentials()
            self.client = gspread.authorize(creds)
            
            # Inicializar spreadsheets principales
            for key, config in settings.SHEETS.items():
                try:
                    self.spreadsheets[key] = self.client.open_by_key(config['id'])
                except Exception as e:
                    pass
            
            # Set default sheet (certificados)
            if 'certificados' in self.spreadsheets:
                self.sheet = self.spreadsheets['certificados'].sheet1
            

        except Exception as e:
            traceback.print_exc()
            # No levantamos excepción para que la app no muera, pero el servicio no funcionará
            self.client = None
            raise Exception(f"Error conectando a Google Sheets: {str(e)}")
    
    def get_all_certificates(self) -> List[Dict]:
        """Obtiene todos los certificados desde la hoja principal"""
        try:
            records = self.sheet.get_all_records()
            return records
        except Exception as e:
            raise Exception(f"Error obteniendo certificados: {str(e)}")
    
    def get_all_certificates_qr(self) -> List[Dict]:
        """Obtiene todos los certificados desde la hoja CERTIFICADOS QR"""
        try:
            # Obtener el spreadsheet de certificados
            spreadsheet = self.spreadsheets.get('certificados')
            if not spreadsheet:
                sheet_id = settings.SHEETS['certificados']['id']
                spreadsheet = self.client.open_by_key(sheet_id)
                self.spreadsheets['certificados'] = spreadsheet
            
            # Obtener la hoja CERTIFICADOS QR
            worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
            records = worksheet_qr.get_all_records()
            # Mostrar primero los más recientes (últimas filas de la hoja)
            records = list(reversed(records))
            
            # Mapear los campos de CERTIFICADOS QR al formato esperado por el frontend
            certificados_mapeados = []
            for record in records:
                # Separar nombre completo en nombres y apellidos
                nombre_completo = record.get('NOMBRE COMPLETO DEL CLIENTE', '') or record.get('NOMBRE COMPLETO', '') or ''
                nombres = ''
                apellidos = ''
                if nombre_completo:
                    partes = nombre_completo.split(' ', 1)
                    if len(partes) >= 2:
                        nombres = partes[0]
                        apellidos = ' '.join(partes[1:])
                    else:
                        nombres = nombre_completo
                
                certificado_mapeado = {
                    'codigo': record.get('CODIGO', '') or record.get('codigo', ''),
                    'nombres': nombres,
                    'apellidos': apellidos,
                    'dni': record.get('DNI DEL CLIENTE', '') or record.get('DNI', '') or record.get('dni', ''),
                    'curso': record.get('CURSO', '') or record.get('curso', ''),
                    'fecha_emision': record.get('FECHA EMISION', '') or record.get('FECHA EMISIÓN', '') or record.get('fecha_emision', ''),
                    'horas': record.get('HORAS', '') or record.get('horas', ''),
                    'estado': record.get('ESTADO', 'VALIDO') or record.get('estado', 'VALIDO'),
                    'pdf_url': record.get('PDF_URL', '') or record.get('pdf_url', ''),
                    # Campos adicionales de CERTIFICADOS QR
                    'nombre_completo': nombre_completo,
                    'celular': record.get('CELULAR DEL CLIENTE', '') or record.get('celular', ''),
                    'correo': record.get('CORREO DEL CLIENTE', '') or record.get('correo', ''),
                    'nro': record.get('NRO', '') or record.get('nro', ''),
                    'especialidad': record.get('ESPECIALIDAD', '') or record.get('especialidad', ''),
                    'p_certificado': record.get('P. CERTIFICADO', '') or record.get('p_certificado', ''),
                            'n_folio': record.get('N.FOLIO', '') or record.get('N_FOLIO', '') or record.get('n_folio', '') or '',
                            'n_libro': record.get('N.LIBRO', '') or record.get('N_LIBRO', '') or record.get('n_libro', '') or '',
                            'n_registro': record.get('N.REGISTRO', '') or record.get('N_REGISTRO', '') or record.get('n_registro', '') or '',
                            'n_codigo': record.get('N.CODIGO', '') or record.get('N_CODIGO', '') or record.get('n_codigo', '') or '',
                    'mencion': record.get('MENCIÓN', '') or record.get('mencion', ''),
                    'f_inicio': record.get('F. INICIO', '') or record.get('f_inicio', ''),
                    'f_termino': record.get('F. TÉRMINO', '') or record.get('f_termino', ''),
                }
                certificados_mapeados.append(certificado_mapeado)
            
            return certificados_mapeados
        except Exception as e:
            raise Exception(f"Error obteniendo certificados desde CERTIFICADOS QR: {str(e)}")
    
    def get_certificate_by_code(self, codigo: str) -> Optional[Dict]:
        """Busca un certificado por código en CERTIFICADOS QR"""
        try:
            # Buscar primero en CERTIFICADOS QR (donde se guardan los certificados ahora)
            spreadsheet = self.spreadsheets.get('certificados')
            if not spreadsheet:
                sheet_id = settings.SHEETS['certificados']['id']
                spreadsheet = self.client.open_by_key(sheet_id)
                self.spreadsheets['certificados'] = spreadsheet
            
            try:
                worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
                records = worksheet_qr.get_all_records()
                
                for record in records:
                    # Buscar por código (puede estar en diferentes columnas)
                    codigo_record = (
                        record.get("CODIGO", "") or 
                        record.get("CÓDIGO", "") or 
                        record.get("codigo", "")
                    )
                    codigo_clean = str(codigo_record).strip() if codigo_record else ""
                    codigo_buscar = codigo.strip()
                    
                    
                    if codigo_clean and codigo_clean.lower() == codigo_buscar.lower():
                        # Separar nombre completo en nombres y apellidos
                        nombre_completo = record.get('NOMBRE COMPLETO DEL CLIENTE', '') or record.get('NOMBRE COMPLETO', '') or ''
                        nombres = ''
                        apellidos = ''
                        if nombre_completo:
                            partes = nombre_completo.split(' ', 1)
                            if len(partes) >= 2:
                                nombres = partes[0]
                                apellidos = ' '.join(partes[1:])
                            else:
                                nombres = nombre_completo
                        
                        # Mapear a formato esperado (incluyendo todos los campos de la mención)
                        # Asegurar que horas sea string o None
                        horas_value = record.get('HORAS', '') or record.get('horas', '')
                        if horas_value:
                            horas_value = str(horas_value) if not isinstance(horas_value, str) else horas_value
                        else:
                            horas_value = None
                        
                        return {
                            'codigo': codigo_clean or '',
                            'nombres': nombres or '',
                            'apellidos': apellidos or '',
                            'nombre_completo': nombre_completo or '',
                            'dni': record.get('DNI DEL CLIENTE', '') or record.get('DNI', '') or record.get('dni', '') or '',
                            'curso': record.get('CURSO', '') or record.get('P. CERTIFICADO', '') or record.get('curso', '') or '',
                            'fecha_emision': record.get('FECHA EMISION', '') or record.get('FECHA EMISIÓN', '') or record.get('F. EMISIÓN', '') or record.get('fecha_emision', '') or '',
                            'horas': horas_value,
                            'estado': record.get('ESTADO', 'VALIDO') or record.get('estado', 'VALIDO') or 'VALIDO',
                            'pdf_url': record.get('PDF_URL', '') or record.get('PDF URL', '') or record.get('pdf_url', '') or None,
                            # Campos adicionales para el PDF con plantilla
                            'mencion': record.get('MENCIÓN', '') or record.get('mencion', '') or '',
                            'f_inicio': record.get('F. INICIO', '') or record.get('f_inicio', '') or '',
                            'f_termino': record.get('F. TÉRMINO', '') or record.get('F. TERMINO', '') or record.get('f_termino', '') or '',
                            'p_certificado': record.get('P. CERTIFICADO', '') or record.get('p_certificado', '') or '',
                            'n_folio': record.get('N.FOLIO', '') or record.get('N_FOLIO', '') or record.get('n_folio', '') or '',
                            'n_libro': record.get('N.LIBRO', '') or record.get('N_LIBRO', '') or record.get('n_libro', '') or '',
                            'n_registro': record.get('N.REGISTRO', '') or record.get('N_REGISTRO', '') or record.get('n_registro', '') or '',
                            'n_codigo': record.get('N.CODIGO', '') or record.get('N_CODIGO', '') or record.get('n_codigo', '') or '',
                        }
                
            except gspread.exceptions.WorksheetNotFound:
                pass
            
            # Fallback: buscar en la hoja principal (por compatibilidad)
            records = self.sheet.get_all_records()
            for record in records:
                if record.get("codigo", "").strip().lower() == codigo.strip().lower():
                    return record
            
            return None
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise Exception(f"Error buscando certificado: {str(e)}")
    
    def create_certificate(self, data: Dict, mencion_data: Optional[Dict] = None) -> Dict:
        """Crea un nuevo certificado en el Sheet y en CERTIFICADOS QR"""
        try:
            # Validar que el código esté presente
            if not data.get("codigo"):
                raise ValueError("El código del certificado es requerido")
            
            # Verificar que el código no exista
            existing = self.get_certificate_by_code(data["codigo"])
            if existing:
                raise ValueError(f"El código {data['codigo']} ya existe")
            
            # 1. Guardar en la hoja original (certificados)
            try:
                headers = self.sheet.row_values(1)
                if not headers:
                    raise Exception("La hoja de certificados no tiene headers definidos")
                
                row = []
                for header in headers:
                    value = data.get(header, "")
                    row.append(str(value) if value else "")
                
                
                self.sheet.append_row(row)
            except Exception as e_main:
                import traceback
                traceback.print_exc()
                raise Exception(f"Error guardando en hoja de certificados: {str(e_main)}")
            
            # 2. Guardar también en CERTIFICADOS QR con datos del cliente
            try:
                
                # Obtener el spreadsheet de certificados
                spreadsheet = self.spreadsheets.get('certificados')
                if not spreadsheet:
                    sheet_id = settings.SHEETS['certificados']['id']
                    spreadsheet = self.client.open_by_key(sheet_id)
                    self.spreadsheets['certificados'] = spreadsheet
                
                # Listar todas las hojas disponibles para debug
                available_sheets = [ws.title for ws in spreadsheet.worksheets()]
                
                # Obtener la hoja CERTIFICADOS QR
                worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
                
                # Obtener headers de la fila 1
                # Verificar si la hoja tiene datos
                all_values = worksheet_qr.get_all_values()
                
                # Obtener headers de la fila 1
                headers_qr = worksheet_qr.row_values(1) if len(all_values) > 0 else []
                
                # Si no hay headers o la hoja está vacía, crear headers básicos en la fila 1
                if not headers_qr or all(not h.strip() for h in headers_qr if h):
                    headers_basicos = [
                        'CODIGO', 
                        'DNI DEL CLIENTE', 
                        'NOMBRE COMPLETO DEL CLIENTE', 
                        'CELULAR DEL CLIENTE',
                        'CORREO DEL CLIENTE',
                        'CURSO', 
                        'FECHA EMISION', 
                        'HORAS', 
                        'ESTADO', 
                        'PDF_URL',
                        'NRO',
                        'ESPECIALIDAD',
                        'P. CERTIFICADO',
                        'MENCIÓN',
                        'F. INICIO',
                        'F. TÉRMINO'
                    ]
                    
                    # Si la hoja está completamente vacía, usar append_row
                    # Si tiene algo pero no headers válidos, actualizar la fila 1
                    if len(all_values) == 0:
                        worksheet_qr.append_row(headers_basicos)
                    else:
                        # Actualizar la fila 1 con los headers
                        for col_idx, header in enumerate(headers_basicos, start=1):
                            worksheet_qr.update_cell(1, col_idx, header)
                    
                    headers_qr = headers_basicos
                
                # Obtener nombre completo: primero intentar desde 'nombre_completo' o 'NOMBRE COMPLETO DEL CLIENTE'
                # Si no está, combinar nombres + apellidos del formulario
                nombre_completo = (
                    data.get('nombre_completo', '') or 
                    data.get('NOMBRE COMPLETO DEL CLIENTE', '') or
                    data.get('nombreCompleto', '')
                )
                
                # Si no hay nombre completo directo, combinar nombres + apellidos
                if not nombre_completo:
                    nombres = data.get('nombres', '') or data.get('NOMBRES', '')
                    apellidos = data.get('apellidos', '') or data.get('APELLIDOS', '')
                    nombre_completo = f"{nombres} {apellidos}".strip()
                
                # Mapear los datos del certificado a los headers de CERTIFICADOS QR
                row_qr = []
                for header in headers_qr:
                    header_upper = header.upper().strip()
                    
                    # Mapear campos comunes
                    if header_upper in ['CODIGO', 'CÓDIGO', 'CODIGO CERTIFICADO']:
                        value = data.get('codigo', '') or data.get('CODIGO', '')
                    elif header_upper in ['DNI', 'DNI DEL CLIENTE', 'DNI CLIENTE']:
                        # Solo guardar DNI si está disponible
                        value = data.get('dni', '') or data.get('DNI', '') or ''
                    elif header_upper in ['NOMBRE COMPLETO', 'NOMBRE COMPLETO DEL CLIENTE', 'NOMBRE', 'CLIENTE', 'NOMBRES', 'APELLIDOS']:
                        # Para cualquier campo de nombre, usar nombre completo (un solo campo)
                        value = nombre_completo
                    elif header_upper in ['CELULAR DEL CLIENTE', 'CELULAR', 'TELEFONO', 'TELÉFONO', 'PHONE']:
                        value = (
                            data.get('CELULAR DEL CLIENTE', '')
                            or data.get('telefono', '')
                            or data.get('TELEFONO', '')
                            or data.get('CELULAR', '')
                        )
                    elif header_upper in ['CORREO DEL CLIENTE', 'CORREO', 'EMAIL', 'E-MAIL']:
                        value = (
                            data.get('CORREO DEL CLIENTE', '')
                            or data.get('email', '')
                            or data.get('EMAIL', '')
                            or data.get('CORREO', '')
                        )
                    elif header_upper in ['CURSO', 'NOMBRE DEL CURSO']:
                        value = data.get('curso', '') or data.get('CURSO', '')
                    elif header_upper in ['FECHA EMISION', 'FECHA DE EMISIÓN', 'FECHA EMISIÓN', 'FECHA']:
                        value = data.get('fecha_emision', '') or data.get('FECHA_EMISION', '') or data.get('FECHA EMISION', '')
                    elif header_upper in ['HORAS', 'HORAS TOTALES', 'TOTAL HORAS']:
                        # Priorizar horas de la mención si está disponible
                        value = data.get('mencion_horas', '') or data.get('horas', '') or data.get('HORAS', '') or (mencion_data.get('HORAS', '') if mencion_data else '')
                    elif header_upper in ['ESTADO', 'ESTADO CERTIFICADO']:
                        value = data.get('estado', 'VALIDO') or data.get('ESTADO', 'VALIDO')
                    elif header_upper in ['PDF_URL', 'PDF URL', 'URL PDF', 'URL']:
                        value = data.get('pdf_url', '') or data.get('PDF_URL', '')
                    elif header_upper in ['NRO', 'NRO MENCION', 'NUMERO MENCION', 'MENCIÓN NRO']:
                        # Número de la mención
                        value = data.get('mencion_nro', '') or (mencion_data.get('NRO', '') if mencion_data else '')
                    elif header_upper in ['ESPECIALIDAD', 'ESPECIALIDAD MENCION']:
                        # Especialidad de la mención
                        value = data.get('mencion_especialidad', '') or (mencion_data.get('ESPECIALIDAD', '') if mencion_data else '')
                    elif header_upper in ['P. CERTIFICADO', 'P CERTIFICADO', 'PROGRAMA CERTIFICADO', 'PROGRAMA']:
                        # Programa/Certificado de la mención
                        value = data.get('mencion_p_certificado', '') or (mencion_data.get('P. CERTIFICADO', '') if mencion_data else '')
                    elif header_upper in ['MENCIÓN', 'MENCION', 'TEXTO MENCION']:
                        # Texto completo de la mención
                        value = data.get('mencion_texto', '') or (mencion_data.get('MENCIÓN', '') if mencion_data else '')
                    elif header_upper in ['F. INICIO', 'FECHA INICIO', 'FECHA DE INICIO', 'F INICIO']:
                        # Fecha de inicio
                        value = data.get('fecha_inicio', '') or (mencion_data.get('F. INICIO', '') if mencion_data else '')
                    elif header_upper in ['F. TÉRMINO', 'F. TERMINO', 'FECHA TERMINO', 'FECHA DE TERMINO', 'F TERMINO']:
                        # Fecha de término
                        value = data.get('fecha_termino', '') or (mencion_data.get('F. TÉRMINO', '') if mencion_data else '')
                    # Nota: Se eliminó el campo "F. EMISIÓN" de la mención en CERTIFICADOS QR para evitar duplicidad con "FECHA EMISION".
                    else:
                        # Intentar buscar el valor directamente
                        value = data.get(header, '') or data.get(header.upper(), '') or data.get(header.lower(), '')
                    
                    row_qr.append(str(value) if value else "")
                
                # Agregar fila a CERTIFICADOS QR
                worksheet_qr.append_row(row_qr)
            except Exception as e_qr:
                pass
                # Si falla guardar en CERTIFICADOS QR, mostrar error detallado
                import traceback
                error_trace = traceback.format_exc()
                # NO fallar la creación del certificado principal, pero mostrar el error claramente
                # El certificado ya se guardó en la hoja principal, así que continuamos
            
            # Retornar el certificado creado
            try:
                certificado_creado = self.get_certificate_by_code(data["codigo"])
                if not certificado_creado:
                    # Si no se encuentra, retornar los datos que se enviaron
                    return data
                return certificado_creado
            except Exception as e_retrieve:
                pass
                # Retornar los datos que se enviaron como fallback
                return data
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            # Limpiar caracteres Unicode problemáticos del mensaje de error
            error_msg = str(e).encode('ascii', 'ignore').decode('ascii')
            raise Exception(f"Error creando certificado: {error_msg}")
    
    def update_certificate(self, codigo: str, data: Dict) -> Dict:
        """Actualiza un certificado existente"""
        try:
            records = self.sheet.get_all_records()
            headers = self.sheet.row_values(1)
            
            # Encontrar la fila
            for idx, record in enumerate(records, start=2):  # start=2 porque row 1 es header
                if record.get("codigo", "").strip().lower() == codigo.strip().lower():
                    # Actualizar valores
                    for header in headers:
                        if header in data:
                            col_idx = headers.index(header) + 1
                            self.sheet.update_cell(idx, col_idx, str(data[header]))
                    return self.get_certificate_by_code(codigo)
            
            raise ValueError(f"Certificado con código {codigo} no encontrado")
        except Exception as e:
            raise Exception(f"Error actualizando certificado: {str(e)}")
    
    def anular_certificate(self, codigo: str, motivo: Optional[str] = None) -> Dict:
        """Anula un certificado cambiando su estado"""
        update_data = {"estado": "ANULADO"}
        if motivo:
            update_data["motivo_anulacion"] = motivo
        return self.update_certificate(codigo, update_data)

    def delete_certificate(self, codigo: str) -> bool:
        """Elimina un certificado de la hoja CERTIFICADOS QR por código"""
        try:
            spreadsheet = self.spreadsheets.get('certificados')
            if not spreadsheet:
                sheet_id = settings.SHEETS['certificados']['id']
                spreadsheet = self.client.open_by_key(sheet_id)
                self.spreadsheets['certificados'] = spreadsheet

            worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
            records = worksheet_qr.get_all_records()

            for row_idx, record in enumerate(records, start=2):
                codigo_record = (
                    record.get("CODIGO", "") or
                    record.get("CÓDIGO", "") or
                    record.get("codigo", "")
                )
                codigo_clean = str(codigo_record).strip() if codigo_record else ""
                if codigo_clean and codigo_clean.lower() == codigo.strip().lower():
                    worksheet_qr.delete_rows(row_idx)
                    return True

            return False
        except Exception as e:
            raise Exception(f"Error eliminando certificado: {str(e)}")
    
    def update_certificate_pdf_url(self, codigo: str, pdf_url: str) -> bool:
        """Actualiza la URL del PDF en CERTIFICADOS QR"""
        try:
            # Obtener el spreadsheet de certificados
            spreadsheet = self.spreadsheets.get('certificados')
            if not spreadsheet:
                sheet_id = settings.SHEETS['certificados']['id']
                spreadsheet = self.client.open_by_key(sheet_id)
                self.spreadsheets['certificados'] = spreadsheet
            
            # Obtener la hoja CERTIFICADOS QR
            worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
            records = worksheet_qr.get_all_records()
            headers = worksheet_qr.row_values(1)
            
            # Buscar el índice de la columna PDF_URL
            pdf_url_col_idx = None
            for idx, header in enumerate(headers):
                if header.upper().strip() in ['PDF_URL', 'PDF URL', 'URL PDF', 'URL']:
                    pdf_url_col_idx = idx + 1  # gspread usa índices base 1
                    break
            
            if not pdf_url_col_idx:
                return False
            
            # Buscar la fila con el código
            for row_idx, record in enumerate(records, start=2):  # start=2 porque row 1 es header
                codigo_record = (
                    record.get("CODIGO", "") or 
                    record.get("CÓDIGO", "") or 
                    record.get("codigo", "")
                )
                codigo_clean = str(codigo_record).strip() if codigo_record else ""
                
                if codigo_clean and codigo_clean.lower() == codigo.strip().lower():
                    # Actualizar la celda PDF_URL
                    worksheet_qr.update_cell(row_idx, pdf_url_col_idx, pdf_url)
                    return True
            
            return False
        except Exception as e:
            import traceback
            traceback.print_exc()
            return False
    
    def update_certificate_fields(self, codigo: str, fields: Dict) -> bool:
        """Actualiza múltiples campos de un certificado en CERTIFICADOS QR"""
        try:
            # Obtener el spreadsheet de certificados
            spreadsheet = self.spreadsheets.get('certificados')
            if not spreadsheet:
                sheet_id = settings.SHEETS['certificados']['id']
                spreadsheet = self.client.open_by_key(sheet_id)
                self.spreadsheets['certificados'] = spreadsheet
            
            # Obtener la hoja CERTIFICADOS QR
            worksheet_qr = spreadsheet.worksheet('CERTIFICADOS QR')
            records = worksheet_qr.get_all_records()
            headers = worksheet_qr.row_values(1)
            
            # Asegurar que las columnas existan, si no, crearlas
            headers_upper = [h.upper().strip() for h in headers]
            new_headers = []
            
            # Mapeo de nombres de campos a posibles nombres de columnas en el Sheet
            field_to_column_map = {
                'CODIGO CERTIFICADO': ['CODIGO CERTIFICADO', 'CODIGO_CERTIFICADO', 'CÓDIGO CERTIFICADO'],
                'FECHA_GENERACION': ['FECHA GENERACION', 'FECHA_GENERACION', 'FECHA DE GENERACION', 'FECHA GENERACIÓN'],
                'PDF_URL': ['PDF_URL', 'PDF URL', 'URL PDF', 'URL']
            }
            
            for field_name in fields.keys():
                field_upper = field_name.upper().strip()
                # Buscar variaciones del nombre de la columna
                found = False
                possible_names = field_to_column_map.get(field_name, [field_name])
                
                for possible_name in possible_names:
                    for idx, header_upper in enumerate(headers_upper):
                        if possible_name.upper().strip() == header_upper or field_upper in header_upper or header_upper in field_upper:
                            found = True
                            break
                    if found:
                        break
                
                if not found:
                    # Agregar nueva columna solo si no es un campo mapeado
                    if field_name not in field_to_column_map:
                        new_headers.append(field_name)
                    else:
                        # Usar el primer nombre del mapeo como nombre de columna
                        new_headers.append(possible_names[0])
            
            # Agregar nuevas columnas si es necesario
            if new_headers:
                last_col = len(headers)
                for new_header in new_headers:
                    worksheet_qr.update_cell(1, last_col + 1, new_header)
                    headers.append(new_header)
                    headers_upper.append(new_header.upper().strip())
                    last_col += 1
            
            # Buscar la fila con el código (usando CODIGO, no CODIGO CERTIFICADO)
            for row_idx, record in enumerate(records, start=2):  # start=2 porque row 1 es header
                codigo_record = (
                    record.get("CODIGO", "") or 
                    record.get("CÓDIGO", "") or 
                    record.get("codigo", "")
                )
                codigo_clean = str(codigo_record).strip() if codigo_record else ""
                
                if codigo_clean and codigo_clean.lower() == codigo.strip().lower():
                    # Actualizar cada campo
                    for field_name, field_value in fields.items():
                        field_upper = field_name.upper().strip()
                        col_idx = None
                        
                        # Buscar la columna usando el mapeo
                        possible_names = field_to_column_map.get(field_name, [field_name])
                        for possible_name in possible_names:
                            for idx, header_upper in enumerate(headers_upper):
                                if possible_name.upper().strip() == header_upper:
                                    col_idx = idx + 1  # gspread usa índices base 1
                                    break
                            if col_idx:
                                break
                        
                        # Si no se encontró con el mapeo exacto, buscar por similitud
                        if not col_idx:
                            for idx, header_upper in enumerate(headers_upper):
                                if field_upper in header_upper or header_upper in field_upper:
                                    col_idx = idx + 1
                                    break
                        
                        if col_idx:
                            worksheet_qr.update_cell(row_idx, col_idx, str(field_value))
                        else:
                            pass
                    
                    return True
            
            return False
        except Exception as e:
            import traceback
            traceback.print_exc()
            return False
    
    def get_worksheet(self, worksheet_name: str, sheet_type: str = 'certificados'):
        """
        Obtiene una hoja específica del spreadsheet
        
        Args:
            worksheet_name: Nombre de la hoja/worksheet
            sheet_type: Tipo de sheet ('certificados' o 'menciones')
        """
        try:
            if sheet_type == 'menciones':
                spreadsheet = self.spreadsheets.get('menciones')
                if not spreadsheet:
                    menciones_sheet_id = settings.SHEETS['menciones']['id']
                    spreadsheet = self.client.open_by_key(menciones_sheet_id)
                    self.spreadsheets['menciones'] = spreadsheet
            else:
                spreadsheet = self.spreadsheets.get('certificados')
                if not spreadsheet:
                    sheet_id = settings.SHEETS['certificados']['id']
                    spreadsheet = self.client.open_by_key(sheet_id)
                    self.spreadsheets['certificados'] = spreadsheet
            
            return spreadsheet.worksheet(worksheet_name)
        except Exception as e:
            raise Exception(f"Error obteniendo worksheet {worksheet_name} de {sheet_type}: {str(e)}")
    
    def get_compras_pendientes(self) -> List[Dict]:
        """Obtiene compras pendientes de procesar (sin código generado)"""
        try:
            worksheet = self.get_worksheet('compras', sheet_type='certificados')
            records = worksheet.get_all_records()
            
            # Filtrar compras sin código o con código vacío
            pendientes = []
            for record in records:
                codigo = record.get('codigo', '').strip() if record.get('codigo') else ''
                if not codigo or codigo == '':
                    pendientes.append(record)
            
            return pendientes
        except Exception as e:
            raise Exception(f"Error obteniendo compras pendientes: {str(e)}")
    
    def update_compra_codigo(self, row_index: int, codigo: str, **kwargs) -> bool:
        """Actualiza el código en una fila de compras y otros campos
        
        Args:
            row_index: Índice de la fila (1-based, incluyendo header)
            codigo: Código a actualizar
            **kwargs: Otros campos a actualizar
        """
        try:
            worksheet = self.get_worksheet('compras', sheet_type='certificados')
            headers = worksheet.row_values(1)
            
            # Encontrar índices de columnas
            updates = {}
            
            if 'codigo' in headers:
                codigo_col = headers.index('codigo') + 1
                updates[codigo_col] = codigo
            
            # Actualizar otros campos si se proporcionan
            for key, value in kwargs.items():
                if key in headers:
                    col_idx = headers.index(key) + 1
                    updates[col_idx] = str(value)
            
            # Actualizar todas las celdas de una vez (más eficiente)
            if updates:
                for col_idx, value in updates.items():
                    worksheet.update_cell(row_index, col_idx, value)
            
            return True
        except Exception as e:
            raise Exception(f"Error actualizando compra: {str(e)}")
    
    def get_menciones(self, force_refresh: bool = False) -> List[Dict]:
        """
        Obtiene todas las menciones desde Google Sheets con caché
        
        Args:
            force_refresh: Si es True, fuerza la actualización del caché
        """
        # Verificar si hay caché válido
        if not force_refresh and self._cache_menciones is not None:
            if self._cache_menciones_timestamp and (datetime.now() - self._cache_menciones_timestamp) < self._cache_ttl:
                return self._cache_menciones
        
        try:
            worksheet = self.get_worksheet('MENCIONES', sheet_type='menciones')
            records = worksheet.get_all_records()
            
            # Actualizar caché
            self._cache_menciones = records
            self._cache_menciones_timestamp = datetime.now()
            
            return records
        except Exception as e:
            raise Exception(f"Error obteniendo menciones: {str(e)}")
    
    def get_mencion_by_nro(self, nro: str) -> Optional[Dict]:
        """Busca una mención por NRO"""
        try:
            menciones = self.get_menciones()
            for mencion in menciones:
                nro_actual = str(mencion.get('NRO', '')).strip()
                if nro_actual == str(nro).strip():
                    return mencion
            return None
        except Exception as e:
            raise Exception(f"Error buscando mención por NRO: {str(e)}")
    
    def get_mencion_by_text(self, mencion_text: str) -> Optional[Dict]:
        """Busca una mención por texto de MENCIÓN"""
        try:
            menciones = self.get_menciones()
            mencion_text_lower = mencion_text.lower().strip()
            for mencion in menciones:
                mencion_actual = str(mencion.get('MENCIÓN', '')).lower().strip()
                if mencion_actual == mencion_text_lower:
                    return mencion
            return None
        except Exception as e:
            raise Exception(f"Error buscando mención por texto: {str(e)}")
    
    # ========== MÉTODOS PARA CLIENTES ==========
    
    def get_all_clientes(self, force_refresh: bool = False) -> List[Dict]:
        """
        Obtiene todos los clientes desde Google Sheets con caché
        
        Args:
            force_refresh: Si es True, fuerza la actualización del caché
        """
        # Verificar si hay caché válido
        if not force_refresh and self._cache_clientes is not None:
            if self._cache_clientes_timestamp and (datetime.now() - self._cache_clientes_timestamp) < self._cache_ttl:
                return self._cache_clientes
        
        try:
            # Obtener la hoja CLIENTES del spreadsheet de clientes
            worksheet = self.get_worksheet(settings.SHEETS['clientes']['worksheets']['clientes'], sheet_type='clientes')
            records = worksheet.get_all_records()
            
            # Actualizar caché
            self._cache_clientes = records
            self._cache_clientes_timestamp = datetime.now()
            
            return records
        except gspread.exceptions.WorksheetNotFound:
            pass
            # Si no encuentra la hoja, listar las hojas disponibles para debug
            spreadsheet = self.spreadsheets.get('clientes')
            if spreadsheet:
                available_sheets = [ws.title for ws in spreadsheet.worksheets()]
                raise Exception(f"Hoja 'CLIENTES' no encontrada. Hojas disponibles: {', '.join(available_sheets)}")
            raise Exception("No se pudo acceder al spreadsheet. Verifica la configuración.")
        except Exception as e:
            raise Exception(f"Error obteniendo clientes: {str(e)}")
    
    def get_cliente_by_dni(self, dni: str) -> Optional[Dict]:
        """Busca un cliente por DNI"""
        try:
            clientes = self.get_all_clientes()
            dni_clean = dni.replace('-', '').replace('.', '').replace(' ', '').strip()
            for cliente in clientes:
                # Buscar DNI en diferentes formatos de columnas
                cliente_dni = str(
                    cliente.get('DNI DEL CLIENTE', '') or 
                    cliente.get('DNI', '') or 
                    cliente.get('dni', '') or
                    cliente.get('DNI DEL CLIENTE', '')
                ).replace('-', '').replace('.', '').replace(' ', '').strip()
                if cliente_dni.lower() == dni_clean.lower():
                    return cliente
            return None
        except Exception as e:
            raise Exception(f"Error buscando cliente por DNI: {str(e)}")
    
    def create_cliente(self, data: Dict) -> Dict:
        """Crea un nuevo cliente en el Sheet y actualiza el caché"""
        try:
            worksheet = self.get_worksheet(settings.SHEETS['clientes']['worksheets']['clientes'], sheet_type='clientes')
            
            # Verificar que el DNI no exista
            dni = data.get('DNI DEL CLIENTE') or data.get('DNI') or data.get('dni')
            if dni:
                existing = self.get_cliente_by_dni(str(dni))
                if existing:
                    raise ValueError(f"El cliente con DNI {dni} ya existe")
            
            # Obtener headers
            headers = worksheet.row_values(1)
            
            # Mapear datos a los headers del Sheet
            # Si viene 'nombres' y 'apellidos' separados, combinarlos en 'NOMBRE COMPLETO DEL CLIENTE'
            mapped_data = {}
            for header in headers:
                # Buscar el valor en diferentes formatos
                if header == 'NOMBRE COMPLETO DEL CLIENTE':
                    nombres = data.get('nombres', '') or data.get('NOMBRES', '')
                    apellidos = data.get('apellidos', '') or data.get('APELLIDOS', '')
                    mapped_data[header] = f"{nombres} {apellidos}".strip()
                elif header == 'DNI DEL CLIENTE':
                    mapped_data[header] = data.get('DNI DEL CLIENTE') or data.get('DNI') or data.get('dni') or ''
                elif header == 'CELULAR DEL CLIENTE':
                    mapped_data[header] = data.get('CELULAR DEL CLIENTE') or data.get('telefono') or data.get('TELEFONO') or ''
                elif header == 'CORREO DEL CLIENTE':
                    mapped_data[header] = data.get('CORREO DEL CLIENTE') or data.get('email') or data.get('EMAIL') or ''
                else:
                    # Intentar encontrar el valor por cualquier variación
                    header_lower = header.lower()
                    for key, value in data.items():
                        if key.lower() == header_lower or key.lower().replace(' ', '_') == header_lower.replace(' ', '_'):
                            mapped_data[header] = value
                            break
                    if header not in mapped_data:
                        mapped_data[header] = ''
            
            # Preparar fila según los headers del Sheet
            row = []
            for header in headers:
                value = mapped_data.get(header, "")
                row.append(str(value) if value else "")
            
            # Agregar fila
            worksheet.append_row(row)
            
            # Invalidar caché de clientes
            self._cache_clientes = None
            self._cache_clientes_timestamp = None
            
            # Retornar el cliente creado
            if dni:
                return self.get_cliente_by_dni(str(dni))
            return mapped_data
        except Exception as e:
            raise Exception(f"Error creando cliente: {str(e)}")
    
    def update_cliente(self, dni: str, data: Dict) -> Dict:
        """Actualiza un cliente existente"""
        try:
            worksheet = self.get_worksheet(settings.SHEETS['clientes']['worksheets']['clientes'], sheet_type='clientes')
            records = worksheet.get_all_records()
            headers = worksheet.row_values(1)
            
            dni_clean = dni.replace('-', '').replace('.', '').replace(' ', '').strip()
            
            # Mapear datos a los headers del Sheet
            mapped_data = {}
            for header in headers:
                if header == 'NOMBRE COMPLETO DEL CLIENTE':
                    # Buscar directamente 'NOMBRE COMPLETO DEL CLIENTE' o 'nombreCompleto'
                    nombre_completo = data.get('NOMBRE COMPLETO DEL CLIENTE') or data.get('nombreCompleto') or data.get('NOMBRE_COMPLETO')
                    if nombre_completo:
                        mapped_data[header] = str(nombre_completo).strip()
                elif header == 'CELULAR DEL CLIENTE':
                    telefono = data.get('CELULAR DEL CLIENTE') or data.get('telefono') or data.get('TELEFONO') or data.get('CELULAR')
                    if telefono:
                        mapped_data[header] = str(telefono).strip()
                elif header == 'CORREO DEL CLIENTE':
                    email = data.get('CORREO DEL CLIENTE') or data.get('email') or data.get('EMAIL') or data.get('CORREO')
                    if email:
                        mapped_data[header] = str(email).strip()
                elif header in data and data[header]:
                    mapped_data[header] = str(data[header]).strip()
            
            
            # Encontrar la fila
            for idx, record in enumerate(records, start=2):  # start=2 porque row 1 es header
                record_dni = str(
                    record.get('DNI DEL CLIENTE', '') or 
                    record.get('DNI', '') or 
                    record.get('dni', '')
                ).replace('-', '').replace('.', '').replace(' ', '').strip()
                if record_dni.lower() == dni_clean.lower():
                    # Actualizar valores
                    for header, value in mapped_data.items():
                        if header in headers:
                            col_idx = headers.index(header) + 1
                            worksheet.update_cell(idx, col_idx, str(value))
                    
                    # Invalidar caché de clientes
                    self._cache_clientes = None
                    self._cache_clientes_timestamp = None
                    
                    return self.get_cliente_by_dni(dni)
            
            raise ValueError(f"Cliente con DNI {dni} no encontrado")
        except Exception as e:
            raise Exception(f"Error actualizando cliente: {str(e)}")
    
    def delete_cliente(self, dni: str) -> bool:
        """Elimina un cliente (marca como eliminado o elimina la fila)"""
        try:
            worksheet = self.get_worksheet(settings.SHEETS['clientes']['worksheets']['clientes'], sheet_type='clientes')
            records = worksheet.get_all_records()
            
            dni_clean = dni.replace('-', '').replace('.', '').replace(' ', '').strip()
            
            # Encontrar la fila
            for idx, record in enumerate(records, start=2):
                record_dni = str(
                    record.get('DNI DEL CLIENTE', '') or 
                    record.get('DNI', '') or 
                    record.get('dni', '')
                ).replace('-', '').replace('.', '').replace(' ', '').strip()
                if record_dni.lower() == dni_clean.lower():
                    # Eliminar fila
                    worksheet.delete_rows(idx)
                    
                    # Invalidar caché de clientes
                    self._cache_clientes = None
                    self._cache_clientes_timestamp = None
                    
                    return True
            
            return False
        except Exception as e:
            raise Exception(f"Error eliminando cliente: {str(e)}")


# Instancia global del servicio
sheets_service = GoogleSheetsService()
