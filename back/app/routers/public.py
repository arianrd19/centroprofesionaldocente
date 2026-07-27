import logging
from io import BytesIO
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.models.schemas import CertificateResponse, CertificateSearch
from app.core.google_sheets import sheets_service
from app.core.config import settings
from app.core.pdf_generator import generate_certificate_pdf
from app.core.errors import raise_safe_500
from app.core.limiter import limiter

_log = logging.getLogger(__name__)

router = APIRouter()

PUBLIC_RATE_LIMIT = f"{settings.RATE_LIMIT_PER_MINUTE}/minute"


@router.get("/certificados/{codigo}", response_model=CertificateResponse)
@limiter.limit(PUBLIC_RATE_LIMIT)
async def get_certificate(codigo: str, request: Request):
    """Obtiene un certificado por código (público)"""
    try:
        # Obtener desde Google Sheets
        try:
            certificado = sheets_service.get_certificate_by_code(codigo)
        except Exception as e_sheets:
            raise_safe_500(_log, "Error buscando certificado en Google Sheets", e_sheets)
        
        if not certificado:
            return CertificateResponse(found=False)
        
        
        # Asegurar que todos los campos tengan valores válidos
        codigo_value = certificado.get("codigo") or ""
        nombres_value = certificado.get("nombres") or ""
        apellidos_value = certificado.get("apellidos") or ""
        curso_value = certificado.get("curso") or ""
        fecha_emision_value = certificado.get("fecha_emision") or ""
        horas_value = certificado.get("horas")
        if horas_value is not None:
            horas_value = str(horas_value) if not isinstance(horas_value, str) else horas_value
        estado_value = certificado.get("estado", "VALIDO") or "VALIDO"
        pdf_url_value = certificado.get("pdf_url") or None
        
        verify_url = f"{settings.BASE_URL}/consulta/{codigo_value}"
        
        try:
            response = CertificateResponse(
                found=True,
                codigo=codigo_value,
                nombres=nombres_value,
                apellidos=apellidos_value,
                curso=curso_value,
                fecha_emision=fecha_emision_value,
                horas=horas_value,
                estado=estado_value,
                pdf_url=pdf_url_value,
                verify_url=verify_url
            )
            return response
        except Exception as e_response:
            pass
            # No exponer detalles del error al usuario
            raise HTTPException(status_code=500, detail="Error procesando certificado")
    except HTTPException:
        raise
    except Exception as e:
        pass
        # No exponer detalles del error al usuario
        raise HTTPException(status_code=500, detail="Error obteniendo certificado")


@router.post("/buscar", response_model=CertificateResponse)
@limiter.limit(PUBLIC_RATE_LIMIT)
async def search_certificate(search: CertificateSearch, request: Request):
    """Busca un certificado por código (público)"""
    try:
        certificado = sheets_service.get_certificate_by_code(search.codigo)
        
        if not certificado:
            return CertificateResponse(found=False)
        
        verify_url = f"{settings.BASE_URL}/consulta/{search.codigo}"
        
        return CertificateResponse(
            found=True,
            codigo=certificado.get("codigo"),
            nombres=certificado.get("nombres"),
            apellidos=certificado.get("apellidos"),
            curso=certificado.get("curso"),
            fecha_emision=certificado.get("fecha_emision"),
            horas=certificado.get("horas"),
            estado=certificado.get("estado", "VALIDO"),
            pdf_url=certificado.get("pdf_url"),
            verify_url=verify_url
        )
    except Exception as e:
        raise_safe_500(_log, "Error buscando certificado", e)


@router.get("/certificados/{codigo}/pdf")
@limiter.limit(PUBLIC_RATE_LIMIT)
async def download_certificate_pdf(
    codigo: str,
    request: Request,
    force_regenerate: bool = False,
    download: bool = False
):
    """
    Descarga el PDF del certificado (público). Siempre se genera/sirve al vuelo,
    nunca se guarda en el servidor. Si el certificado tiene una versión unida o
    reemplazada manualmente (subida a Drive por un operador), se sirve esa en su
    lugar; de lo contrario se genera desde los datos de la hoja.
    """
    try:
        certificado = sheets_service.get_certificate_by_code(codigo)

        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")

        disposition_type = "attachment" if download else "inline"
        nombre_completo = f"{certificado.get('nombres', '')}_{certificado.get('apellidos', '')}"
        filename = f"certificado_{nombre_completo.replace(' ', '_')}.pdf"

        pdf_url = certificado.get("pdf_url")
        if pdf_url and "drive.google.com" in pdf_url and not force_regenerate:
            from app.core.google_drive import extract_file_id, download_file_bytes
            file_id = extract_file_id(pdf_url)
            if file_id:
                try:
                    pdf_content = download_file_bytes(file_id)
                    return StreamingResponse(
                        BytesIO(pdf_content),
                        media_type="application/pdf",
                        headers={
                            "Content-Disposition": f"{disposition_type}; filename={filename}",
                            "X-Content-Type-Options": "nosniff"
                        }
                    )
                except Exception as e_drive:
                    _log.warning("No se pudo servir PDF desde Drive para %s: %s", codigo, e_drive)
                    # Continuar y generar el PDF estándar como respaldo

        # Generar PDF al vuelo a partir de los datos de la hoja (no se guarda en ningún lado)
        pdf_buffer = generate_certificate_pdf(certificado)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"{disposition_type}; filename={filename}",
                "X-Content-Type-Options": "nosniff"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise_safe_500(_log, "Error generando PDF", e)

