import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
from io import BytesIO
from app.models.schemas import (
    CertificateCreate, CertificateUpdate, CertificateResponse,
    CertificateAnular, UserResponse
)
from app.core.google_sheets import sheets_service
from app.core.security import get_operator_or_admin, get_admin_user
from app.core.config import settings
from app.core.qr_generator import generate_qr_code
from app.core.users import list_all_users
from app.core.errors import raise_safe_500
from datetime import datetime

_log = logging.getLogger(__name__)

router = APIRouter()


def _first_sheet_value(data: Optional[dict], keys: List[str], default: str = "") -> str:
    """Return first non-empty value from a list of possible sheet headers."""
    if not data:
        return default
    for key in keys:
        value = data.get(key)
        if value not in (None, ""):
            return value
    return default


@router.post("/certificados", response_model=CertificateResponse)
async def create_certificate(
    certificado: CertificateCreate,
    mencion_nro: Optional[str] = None,
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Crea un nuevo certificado (Operador/Admin)
    
    Args:
        certificado: Datos del certificado
        mencion_nro: NRO de la mencion desde Google Sheets (ej: "101")
    """
    try:
        # Obtener datos de la mencion si se proporciona
        mencion_data = None
        mencion_text = ""
        
        if mencion_nro:
            mencion_data = sheets_service.get_mencion_by_nro(mencion_nro)
            if mencion_data:
                mencion_text = _first_sheet_value(mencion_data, ["MENCI\u00d3N", "MENCION"], "")
                # Si no se proporcionaron horas o curso, usar los de la mencion
                if not certificado.horas and mencion_data.get('HORAS'):
                    certificado.horas = mencion_data.get('HORAS')
                if not certificado.curso and mencion_data.get('P. CERTIFICADO'):
                    certificado.curso = mencion_data.get('P. CERTIFICADO')
                if not certificado.fecha_emision and _first_sheet_value(
                    mencion_data, ["F. EMISI\u00d3N", "F. EMISION", "FECHA EMISI\u00d3N", "FECHA EMISION"], ""
                ):
                    certificado.fecha_emision = _first_sheet_value(
                        mencion_data, ["F. EMISI\u00d3N", "F. EMISION", "FECHA EMISI\u00d3N", "FECHA EMISION"], ""
                    )
        
        # Usar directamente Google Sheets
        certificado_dict = certificado.model_dump()
        certificado_dict["created_at"] = datetime.now().isoformat()
        certificado_dict["updated_at"] = datetime.now().isoformat()

        # Campos de libro/folio ingresados en formulario
        anio = str(certificado_dict.get("anio") or "").strip()
        n_folio = str(certificado_dict.get("n_folio") or "").strip()
        n_libro = str(certificado_dict.get("n_libro") or "").strip()

        # Autocompletado de campos derivados (logica institucional):
        # secuencia = (libro - 1) * 100 + folio
        # N.REGISTRO = {secuencia:03d}-CENPROD-IESPPL
        # N.CODIGO   = {secuencia:03d}-{anio}-CENPROD-IESPPL
        if anio and n_folio and n_libro:
            if not anio.isdigit() or len(anio) != 4:
                raise HTTPException(status_code=400, detail="ANIO debe tener 4 digitos")

            if not n_folio.isdigit() or not n_libro.isdigit():
                raise HTTPException(status_code=400, detail="N.FOLIO y N.LIBRO deben ser numericos")

            folio_num = int(n_folio)
            libro_num = int(n_libro)
            if folio_num < 1 or folio_num > 100:
                raise HTTPException(status_code=400, detail="N.FOLIO debe estar entre 001 y 100")
            if libro_num < 1:
                raise HTTPException(status_code=400, detail="N.LIBRO debe ser mayor o igual a 001")

            secuencia_num = (libro_num - 1) * 100 + folio_num
            secuencia_str = f"{secuencia_num:03d}"

            if not certificado_dict.get("n_registro"):
                certificado_dict["n_registro"] = f"{secuencia_str}-CENPROD-IESPPL"
            if not certificado_dict.get("n_codigo"):
                certificado_dict["n_codigo"] = f"{secuencia_str}-{anio}-CENPROD-IESPPL"

        # Claves equivalentes para mapeo directo hacia headers del Sheet
        if anio:
            certificado_dict["A\u00D1O"] = anio
            certificado_dict["ANIO"] = anio
        if n_folio:
            certificado_dict["N.FOLIO"] = n_folio
        if n_libro:
            certificado_dict["N.LIBRO"] = n_libro
        if certificado_dict.get("n_registro"):
            certificado_dict["N.REGISTRO"] = str(certificado_dict["n_registro"]).strip()
        if certificado_dict.get("n_codigo"):
            certificado_dict["N.CODIGO"] = str(certificado_dict["n_codigo"]).strip()
        
        # nombre_completo ya esta incluido en certificado_dict si viene del frontend
        
        # Incluir datos de la mencion si esta disponible
        if mencion_data:
            certificado_dict["mencion_nro"] = mencion_data.get('NRO', '')
            certificado_dict["mencion_especialidad"] = mencion_data.get('ESPECIALIDAD', '')
            certificado_dict["mencion_p_certificado"] = mencion_data.get('P. CERTIFICADO', '')
            certificado_dict["mencion_texto"] = _first_sheet_value(
                mencion_data, ["MENCI\u00d3N", "MENCION"], ""
            )
            certificado_dict["mencion_horas"] = mencion_data.get('HORAS', '')
            certificado_dict["fecha_inicio"] = mencion_data.get('F. INICIO', '')
            certificado_dict["fecha_termino"] = _first_sheet_value(
                mencion_data, ["F. T\u00c9RMINO", "F. TERMINO", "FECHA T\u00c9RMINO", "FECHA TERMINO"], ""
            )
            certificado_dict["fecha_emision_mencio"] = _first_sheet_value(
                mencion_data, ["F. EMISI\u00d3N", "F. EMISION", "FECHA EMISI\u00d3N", "FECHA EMISION"], ""
            )
        
        # Generar codigo si no se proporciono (reintenta con salt si ya existe)
        if not certificado_dict.get("codigo"):
            from app.core.code_generator import generate_unique_certificate_code
            certificado_dict["codigo"] = generate_unique_certificate_code(
                code_exists=lambda c: bool(sheets_service.get_certificate_by_code(c)),
                dni=certificado.dni,
                mencion_nro=mencion_nro,
            )

        # Enriquecer datos del cliente desde la hoja CLIENTES (si hay DNI)
        try:
            dni_value = certificado_dict.get("dni") or certificado_dict.get("DNI")
            if dni_value:
                cliente = sheets_service.get_cliente_by_dni(str(dni_value))
                if cliente:
                    # Nombre completo del cliente
                    nombre_cliente = (
                        cliente.get("NOMBRE COMPLETO DEL CLIENTE")
                        or cliente.get("NOMBRES")
                        or cliente.get("nombres")
                        or ""
                    )
                    if nombre_cliente and not certificado_dict.get("nombre_completo"):
                        certificado_dict["nombre_completo"] = str(nombre_cliente).strip()

                    # TelAfono y correo
                    telefono_cliente = (
                        cliente.get("CELULAR DEL CLIENTE")
                        or cliente.get("TELEFONO")
                        or cliente.get("telefono")
                        or ""
                    )
                    correo_cliente = (
                        cliente.get("CORREO DEL CLIENTE")
                        or cliente.get("EMAIL")
                        or cliente.get("email")
                        or ""
                    )
                    if telefono_cliente:
                        certificado_dict["telefono"] = str(telefono_cliente).strip()
                    if correo_cliente:
                        certificado_dict["email"] = str(correo_cliente).strip()
        except Exception as e:
            pass
            # No bloquear la creaciA3n si falla el enriquecimiento
        
        try:
            nuevo_certificado = sheets_service.create_certificate(certificado_dict, mencion_data=mencion_data)
        except Exception as e:
            pass
            # Limpiar caracteres Unicode problemAticos del mensaje de error
            error_msg = str(e).encode('ascii', 'ignore').decode('ascii')
            raise HTTPException(status_code=500, detail=f"Error creando certificado en Google Sheets: {error_msg}")
        
        verify_url = f"{settings.BASE_URL}/consulta/{nuevo_certificado.get('codigo')}"
        
        # Actualizar PDF_URL en Google Sheets con la URL de verificaciA3n (la misma que usa el QR)
        try:
            sheets_service.update_certificate_pdf_url(nuevo_certificado.get('codigo'), verify_url)
        except Exception as e_update:
            pass
        
        # Asegurar que nombres y apellidos tengan valores vAlidos
        nombres = nuevo_certificado.get("nombres") or ""
        apellidos = nuevo_certificado.get("apellidos") or ""
        
        # Si no hay nombres/apellidos separados, intentar separar desde nombre_completo
        if not nombres and not apellidos:
            nombre_completo = nuevo_certificado.get("nombre_completo") or nuevo_certificado.get("NOMBRE COMPLETO DEL CLIENTE") or ""
            if nombre_completo:
                partes = str(nombre_completo).strip().split(' ', 1)
                if len(partes) >= 2:
                    nombres = partes[0]
                    apellidos = ' '.join(partes[1:])
                else:
                    nombres = nombre_completo
        
        
        # Convertir horas a string si es nAomero
        horas_value = nuevo_certificado.get("horas")
        if horas_value is not None:
            horas_value = str(horas_value) if not isinstance(horas_value, str) else horas_value
        
        try:
            response = CertificateResponse(
                found=True,
                codigo=nuevo_certificado.get("codigo") or "",
                nombres=nombres,
                apellidos=apellidos,
                curso=nuevo_certificado.get("curso") or "",
                fecha_emision=nuevo_certificado.get("fecha_emision") or "",
                horas=horas_value,
                estado=nuevo_certificado.get("estado", "VALIDO") or "VALIDO",
                pdf_url=nuevo_certificado.get("pdf_url") or None,
                verify_url=verify_url
            )
            return response
        except Exception as e_response:
            pass
            # No exponer detalles del error al usuario
            raise HTTPException(status_code=500, detail="Error procesando certificado")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        pass
        # No exponer detalles del error al usuario
        raise HTTPException(status_code=500, detail="Error creando certificado")


# CRATICO: Esta ruta DEBE estar ANTES de cualquier otra ruta que use /certificados/{codigo}
# FastAPI resuelve rutas en orden de definiciA3n, y las rutas mAs especAficas deben ir primero
# Debe estar justo despuAs de create_certificate para asegurar que se registre antes que otras rutas
@router.get("/certificados/{codigo}/qr", name="download_qr")
async def download_qr(
    codigo: str,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Descarga el cA3digo QR de un certificado (Operador/Admin)"""
    try:
        certificado = sheets_service.get_certificate_by_code(codigo)
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        
        qr_buffer = generate_qr_code(codigo, size=512)
        
        return StreamingResponse(
            qr_buffer,
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=qr_{codigo}.png"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error generando QR", e)


@router.post("/certificados/{codigo}/anular", response_model=CertificateResponse)
async def anular_certificate(
    codigo: str,
    data: CertificateAnular,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Anula un certificado (Operador/Admin)"""
    try:
        certificado_anulado = sheets_service.anular_certificate(codigo, data.motivo)
        
        verify_url = f"{settings.BASE_URL}/consulta/{codigo}"
        
        return CertificateResponse(
            found=True,
            codigo=certificado_anulado.get("codigo"),
            nombres=certificado_anulado.get("nombres"),
            apellidos=certificado_anulado.get("apellidos"),
            curso=certificado_anulado.get("curso"),
            fecha_emision=certificado_anulado.get("fecha_emision"),
            horas=certificado_anulado.get("horas"),
            estado=certificado_anulado.get("estado"),
            pdf_url=certificado_anulado.get("pdf_url"),
            verify_url=verify_url
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise_safe_500(_log, "Error anulando certificado", e)


@router.delete("/certificados/{codigo}")
async def delete_certificate(
    codigo: str,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Elimina un certificado de la lista (CERTIFICADOS QR)"""
    try:
        deleted = sheets_service.delete_certificate(codigo)
        if not deleted:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        return {"message": "Certificado eliminado exitosamente", "codigo": codigo}
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error eliminando certificado", e)


@router.post("/certificados/{codigo}/unir-pdf")
async def unir_pdfs(
    codigo: str,
    pdf_file: UploadFile = File(...),
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Une un PDF adicional al certificado generado.
    El PDF subido se agregarA despuAs del PDF del certificado.
    """
    try:
        # Validar tipo de archivo
        if not pdf_file.content_type == 'application/pdf':
                raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")

        # Validar tamaAo del archivo (mAximo 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_content = await pdf_file.read()
        if len(file_content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="El archivo supera el tamaño máximo permitido (10MB)")

        # Validar que realmente sea un PDF leyendo el header
        if not file_content.startswith(b'%PDF'):
                raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")
        
        # Resetear el archivo para leerlo de nuevo
        pdf_file.file.seek(0)
        
        # Obtener certificado
        certificado = sheets_service.get_certificate_by_code(codigo)
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        
        # Generar PDF del certificado si no existe
        from app.core.pdf_generator import generate_certificate_pdf
        pdf_certificado_buffer = generate_certificate_pdf(certificado)
        pdf_certificado_buffer.seek(0)
        
        # Leer PDF subido (ya validado arriba)
        pdf_subido_content = file_content
        nombre_pdf_subido = pdf_file.filename or f"pdf_subido_{codigo}.pdf"
        # Validar y limpiar el nombre del archivo (prevenir path traversal)
        import re
        nombre_pdf_subido = re.sub(r'[^a-zA-Z0-9._-]', '_', nombre_pdf_subido)
        # Quitar la extensiA3n .pdf del nombre
        if nombre_pdf_subido.lower().endswith('.pdf'):
            nombre_pdf_subido = nombre_pdf_subido[:-4]
        
        # Unir PDFs usando pypdf
        from pypdf import PdfWriter, PdfReader
        
        # Crear writer para el PDF final
        writer = PdfWriter()
        
        # Agregar primero las pAginas del PDF subido
        pdf_subido_buffer = BytesIO(pdf_subido_content)
        reader_subido = PdfReader(pdf_subido_buffer)
        for page in reader_subido.pages:
            writer.add_page(page)
        
        # Agregar despuAs las pAginas del certificado generado
        reader_certificado = PdfReader(pdf_certificado_buffer)
        for page in reader_certificado.pages:
            writer.add_page(page)
        
        # Generar PDF unido en memoria
        pdf_unido_buffer = BytesIO()
        writer.write(pdf_unido_buffer)
        pdf_unido_content = pdf_unido_buffer.getvalue()
        
        # Subir PDF unido a Google Drive (no se guarda en disco local: el
        # contenido subido por el operador no es reproducible desde la hoja)
        from app.core.google_drive import upload_file_to_folder
        filename = f"certificado_{codigo}_unido.pdf"
        drive_url = upload_file_to_folder(
            pdf_unido_content, filename, settings.GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID
        )

        # Obtener timestamp actual
        from datetime import datetime
        timestamp_generacion = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Generar URL de verificaciA3n (la misma que usa el QR)
        verify_url = f"{settings.BASE_URL}/consulta/{codigo}"

        # Actualizar certificado en Google Sheets con mAoltiples campos
        try:
            # IMPORTANTE: Guardar la URL de Drive en PDF_URL para que el endpoint pAoblico
            # sepa encontrarlo y no lo regenere (perdiendo la uniA3n).
            fields_to_update = {
                'PDF_URL': drive_url,
                'CODIGO CERTIFICADO': nombre_pdf_subido,
                'FECHA_GENERACION': timestamp_generacion
            }
            sheets_service.update_certificate_fields(codigo, fields_to_update)
        except Exception as e_update:
            pass
            # Intentar actualizar solo la URL como fallback
            try:
                sheets_service.update_certificate_pdf_url(codigo, drive_url)
            except:
                pass

        return {
            "message": "PDFs unidos exitosamente",
            "codigo": codigo,
            "pdf_url": verify_url,
            "total_paginas": len(reader_certificado.pages) + len(reader_subido.pages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error uniendo PDFs", e)


@router.post("/certificados/{codigo}/reemplazar-pdf")
async def reemplazar_pdf(
    codigo: str,
    pdf_file: UploadFile = File(...),
    current_user: dict = Depends(get_operator_or_admin)
):
    """
    Reemplaza el PDF del certificado por uno subido manualmente.
    """
    try:
        if pdf_file.content_type != 'application/pdf':
                raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")

        max_file_size = 10 * 1024 * 1024  # 10MB
        file_content = await pdf_file.read()
        if len(file_content) > max_file_size:
                raise HTTPException(status_code=400, detail="El archivo supera el tamaño máximo permitido (10MB)")

        if not file_content.startswith(b'%PDF'):
                raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")

        certificado = sheets_service.get_certificate_by_code(codigo)
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")

        nombre_pdf_subido = pdf_file.filename or f"pdf_reemplazo_{codigo}.pdf"
        import re
        nombre_pdf_subido = re.sub(r'[^a-zA-Z0-9._-]', '_', nombre_pdf_subido)
        if nombre_pdf_subido.lower().endswith('.pdf'):
            nombre_pdf_subido = nombre_pdf_subido[:-4]

        # Subir a Google Drive (no se guarda en disco local)
        from app.core.google_drive import upload_file_to_folder
        filename = f"certificado_{codigo}_reemplazo.pdf"
        drive_url = upload_file_to_folder(
            file_content, filename, settings.GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID
        )

        timestamp_generacion = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        fields_to_update = {
            'PDF_URL': drive_url,
            'CODIGO CERTIFICADO': nombre_pdf_subido,
            'FECHA_GENERACION': timestamp_generacion
        }

        update_ok = sheets_service.update_certificate_fields(codigo, fields_to_update)
        if not update_ok:
            sheets_service.update_certificate_pdf_url(codigo, drive_url)

        return {
            "message": "PDF reemplazado exitosamente",
            "codigo": codigo,
            "pdf_url": drive_url
        }

    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error reemplazando PDF", e)


@router.get("/certificados", response_model=List[dict])
async def list_certificates(
    current_user: dict = Depends(get_operator_or_admin)
):
    """Lista todos los certificados desde CERTIFICADOS QR (Operador/Admin)"""
    try:
        # Usar CERTIFICADOS QR (hoja donde se guardan todos los certificados con datos completos)
        certificados = sheets_service.get_all_certificates_qr()
        return certificados
    except Exception as e:
        raise_safe_500(_log, "Error listando certificados", e)


@router.put("/certificados/{codigo}", response_model=CertificateResponse)
async def update_certificate(
    codigo: str,
    certificado: CertificateUpdate,
    current_user: dict = Depends(get_operator_or_admin)
):
    """Actualiza un certificado existente (Operador/Admin)"""
    try:
        update_data = certificado.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        certificado_actualizado = sheets_service.update_certificate(codigo, update_data)
        
        verify_url = f"{settings.BASE_URL}/consulta/{codigo}"
        
        return CertificateResponse(
            found=True,
            codigo=certificado_actualizado.get("codigo"),
            nombres=certificado_actualizado.get("nombres"),
            apellidos=certificado_actualizado.get("apellidos"),
            curso=certificado_actualizado.get("curso"),
            fecha_emision=certificado_actualizado.get("fecha_emision"),
            horas=certificado_actualizado.get("horas"),
            estado=certificado_actualizado.get("estado", "VALIDO"),
            pdf_url=certificado_actualizado.get("pdf_url"),
            verify_url=verify_url
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise_safe_500(_log, "Error actualizando certificado", e)


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_admin_user)):
    """Lista usuarios desde Google Sheets CREDENCIALES."""
    from app.core.users import list_all_users

    return [
        UserResponse(
            email=u["email"],
            role=u["role"],
            active=u.get("active", True),
        )
        for u in list_all_users()
    ]


@router.put("/users/{email}/activate")
async def activate_user(email: str, current_user: dict = Depends(get_admin_user)):
    raise HTTPException(
        status_code=400,
        detail="Activa usuarios editando la columna Estado en Google Sheets (CREDENCIALES).",
    )


@router.put("/users/{email}/deactivate")
async def deactivate_user(email: str, current_user: dict = Depends(get_admin_user)):
    raise HTTPException(
        status_code=400,
        detail="Desactiva usuarios editando la columna Estado en Google Sheets (CREDENCIALES).",
    )
