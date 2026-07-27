"""
Endpoints para procesar compras desde Google Sheets y generar certificados
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import logging
from app.core.google_sheets import sheets_service
from app.core.code_generator import generate_unique_certificate_code
from app.core.storage import storage_service
from app.core.pdf_generator import generate_certificate_pdf
from app.core.security import get_operator_or_admin
from app.core.errors import raise_safe_500
from datetime import datetime

_log = logging.getLogger(__name__)

router = APIRouter()


@router.get("/compras/pendientes")
async def get_compras_pendientes(
    current_user: dict = Depends(get_operator_or_admin)
):
    """Obtiene compras pendientes de procesar desde Google Sheets"""
    try:
        compras = sheets_service.get_compras_pendientes()
        return {
            "total": len(compras),
            "compras": compras
        }
    except Exception as e:
        raise_safe_500(_log, "Error obteniendo compras", e)


@router.post("/compras/{row_index}/procesar")
async def procesar_compra(
    row_index: int,
    mencion_nro: Optional[str] = None,
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Procesa una compra y genera certificado
    
    Args:
        row_index: Índice de la fila en Google Sheets (0-based)
        mencion_nro: NRO de la mención desde Google Sheets (ej: "1050")
    """
    try:
        # Obtener compras pendientes
        compras = sheets_service.get_compras_pendientes()
        
        if row_index >= len(compras):
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        compra = compras[row_index]
        
        # Extraer datos de la compra
        nombres = compra.get('nombres', '').strip()
        apellidos = compra.get('apellidos', '').strip()
        dni = compra.get('dni', '').strip() if compra.get('dni') else None
        curso = compra.get('curso', '').strip()
        fecha_emision = compra.get('fecha_emision', datetime.now().strftime('%Y-%m-%d'))
        horas = compra.get('horas', '')
        
        if not nombres or not apellidos or not curso:
            raise HTTPException(
                status_code=400, 
                detail="Faltan datos requeridos: nombres, apellidos o curso"
            )
        
        # Obtener mención desde Google Sheets
        mencion_data = None
        mencion_text = ""
        
        if not mencion_nro:
            raise HTTPException(status_code=400, detail="Debe proporcionar mencion_nro")
        
        # Buscar en Google Sheets por NRO
        mencion_data = sheets_service.get_mencion_by_nro(mencion_nro)
        if not mencion_data:
            raise HTTPException(status_code=404, detail=f"Mención con NRO {mencion_nro} no encontrada")
        mencion_text = mencion_data.get('MENCIÓN', '')
        
        # Generar código único (reintenta con salt si ya existe en Sheets)
        try:
            codigo = generate_unique_certificate_code(
                code_exists=lambda c: bool(sheets_service.get_certificate_by_code(c)),
                dni=dni,
            )
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))

        # Usar horas de la mención si está disponible, sino usar horas de la compra
        horas_final = horas
        if mencion_data and mencion_data.get('HORAS'):
            horas_final = mencion_data.get('HORAS')
        
        # Generar PDF del certificado
        certificado_data = {
            'codigo': codigo,
            'nombres': nombres,
            'apellidos': apellidos,
            'curso': curso,
            'fecha_emision': fecha_emision,
            'horas': horas_final,
            'mencion': mencion_text
        }
        
        pdf_buffer = generate_certificate_pdf(certificado_data)
        pdf_content = pdf_buffer.read()
        
        # Guardar PDF
        from io import BytesIO
        pdf_filename = f"{codigo}.pdf"
        pdf_file = BytesIO(pdf_content)
        pdf_url = storage_service.upload_file(
            pdf_file,
            pdf_filename,
            content_type="application/pdf"
        )
        storage_info = {
            'path': pdf_filename,
            'url': pdf_url
        }
        
        # Guardar certificado en Google Sheets
        certificado_dict = {
            'codigo': codigo,
            'nombres': nombres,
            'apellidos': apellidos,
            'dni': dni,
            'curso': curso,
            'fecha_emision': fecha_emision,
            'horas': horas_final,
            'estado': 'VALIDO',
            'pdf_url': storage_info['url']
        }
        
        try:
            sheets_service.create_certificate(certificado_dict, mencion_data=mencion_data)
        except Exception as e_sheets:
            raise_safe_500(_log, "Error guardando certificado en Google Sheets", e_sheets)
        
        # Actualizar Google Sheets con el código generado
        try:
            worksheet = sheets_service.get_worksheet('compras')
            all_records = worksheet.get_all_records()
            
            # Buscar la fila que coincide con esta compra
            real_row_index = None
            for idx, record in enumerate(all_records):
                if (record.get('nombres', '').strip() == nombres and
                    record.get('apellidos', '').strip() == apellidos and
                    (not dni or record.get('dni', '').strip() == dni)):
                    real_row_index = idx + 2  # +2 porque: +1 para header, +1 porque es 1-based
                    break
            
            if real_row_index:
                sheets_service.update_compra_codigo(
                    real_row_index,
                    codigo,
                    estado='PROCESADO',
                    fecha_procesado=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                )
        except Exception as e:
            pass
            # Continuar aunque no se actualice Google Sheets
        
        return {
            "success": True,
            "codigo": codigo,
            "certificado": {
                "codigo": codigo,
                "nombres": nombres,
                "apellidos": apellidos,
                "curso": curso,
                "mencion": mencion_text,
                "horas": horas_final,
                "pdf_url": storage_info['url']
            },
            "message": "Certificado generado exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error procesando compra", e)


@router.get("/menciones")
async def get_menciones(
    source: str = "sheets",
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Obtiene todas las menciones disponibles desde Google Sheets
    
    Args:
        source: "sheets" para leer desde Google Sheets (única opción disponible)
    """
    if source != "sheets":
        raise HTTPException(status_code=400, detail="Solo se admite source='sheets'")
    
    try:
        menciones = sheets_service.get_menciones()
        return {
            "total": len(menciones),
            "source": "google_sheets",
            "menciones": [
                {
                    "nro": str(m.get('NRO', '')),
                    "especialidad": m.get('ESPECIALIDAD', ''),
                    "p_certificado": m.get('P. CERTIFICADO', ''),
                    "mencion": m.get('MENCIÓN', ''),
                    "horas": m.get('HORAS', ''),
                    "f_inicio": m.get('F. INICIO', ''),
                    "f_termino": m.get('F. TÉRMINO', ''),
                    "f_emision": m.get('F. EMISIÓN', '')
                }
                for m in menciones
            ]
        }
    except Exception as e:
        raise_safe_500(_log, "Error obteniendo menciones desde Sheets", e)


@router.get("/menciones/{nro}")
async def get_mencion_by_nro(
    nro: str,
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Obtiene los datos de una mención específica por NRO
    
    Útil para cargar datos en el formulario de crear certificado
    """
    try:
        mencion = sheets_service.get_mencion_by_nro(nro)
        if not mencion:
            raise HTTPException(status_code=404, detail=f"Mención con NRO {nro} no encontrada")
        
        return {
            "nro": str(mencion.get('NRO', '')),
            "especialidad": mencion.get('ESPECIALIDAD', ''),
            "p_certificado": mencion.get('P. CERTIFICADO', ''),
            "mencion": mencion.get('MENCIÓN', ''),
            "horas": mencion.get('HORAS', ''),
            "f_inicio": mencion.get('F. INICIO', ''),
            "f_termino": mencion.get('F. TÉRMINO', ''),
            "f_emision": mencion.get('F. EMISIÓN', '')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error obteniendo mención", e)
