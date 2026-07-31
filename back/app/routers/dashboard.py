from typing import Optional
import asyncio
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr, Field

from app.services.dashboard_service import refresh_user_from_sheets
from app.core.security import get_admin_user, get_current_user
from app.core.google_sheets import sheets_service
from app.core.config import settings
from app.core.limiter import limiter
from app.core.dni_lookup import consultar_dni_externo
from app.services import dashboard_service
from app.services.venta_upload import (
    save_certificado_comprobante,
    save_comprobante,
    save_dni_cliente,
    save_serums_comprobante,
)

_log = logging.getLogger(__name__)

UPLOAD_RATE_LIMIT = f"{settings.RATE_LIMIT_PER_MINUTE}/minute"

router = APIRouter()


class AsesorCreateBody(BaseModel):
    email: EmailStr
    nombre: str = Field(..., min_length=2)
    username: str = Field(..., min_length=2)
    codigo: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    rol: str = "Asesor"
    estado: str = "Activo"
    comision: str = "20%"
    posicion: str = ""


class AsesorUpdateBody(BaseModel):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = None
    username: Optional[str] = None
    codigo: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    estado: Optional[str] = None
    comision: Optional[str] = None
    posicion: Optional[str] = None


async def get_dashboard_user(current_user: dict = Depends(get_current_user)):
    profile = refresh_user_from_sheets(current_user["email"])
    if profile:
        return {**current_user, **profile}
    return current_user


@router.get("/me")
async def dashboard_me(user: dict = Depends(get_dashboard_user)):
    return {"user": user}


@router.get("/home")
async def dashboard_home(user: dict = Depends(get_dashboard_user)):
    return dashboard_service.get_home_data(user.get("email", ""))


@router.get("/admin/home")
async def dashboard_admin_home(admin: dict = Depends(get_admin_user)):
    """Estadisticas agregadas de todos los asesores (solo admin)."""
    return dashboard_service.get_admin_home_data()


@router.get("/mi-dashboard")
async def mi_dashboard(
    anio: Optional[int] = None,
    mes: Optional[int] = None,
    codigo: str = "",
    nofilter: bool = False,
    user: dict = Depends(get_dashboard_user),
):
    return dashboard_service.get_mi_dashboard_data(user, anio, mes, codigo, nofilter)


@router.get("/cobranza")
async def cobranza(
    codigo: str = "",
    nofilter: bool = False,
    user: dict = Depends(get_dashboard_user),
):
    return dashboard_service.get_cobranza_data(user, codigo, nofilter)


@router.get("/ventas")
async def ventas(q: str = "", tipo: str = "dni", user: dict = Depends(get_dashboard_user)):
    return dashboard_service.search_ventas(q, tipo)


@router.get("/clientes/{dni}")
async def buscar_cliente_por_dni(
    dni: str,
    user: dict = Depends(get_dashboard_user),
):
    """Busca un cliente en la hoja CLIENTES por DNI (para autocompletar ventas)."""
    try:
        cliente = sheets_service.get_cliente_by_dni(dni.strip())
        if not cliente:
            raise HTTPException(status_code=404, detail=f"Cliente con DNI {dni} no encontrado")
        return cliente
    except HTTPException:
        raise
    except Exception as exc:
        _log.error("Error buscando cliente %s: %s", dni, exc)
        raise HTTPException(status_code=500, detail="Error al buscar el cliente.")


@router.get("/dni-externo/{numero}")
async def buscar_dni_externo(
    numero: str,
    user: dict = Depends(get_dashboard_user),
):
    """Consulta RENIEC (dniruc.apisperu.com) para autocompletar el nombre de un
    cliente nuevo que no está en la hoja CLIENTES."""
    numero = numero.strip()
    if not (numero.isdigit() and len(numero) == 8):
        raise HTTPException(status_code=400, detail="DNI inválido, debe tener 8 dígitos.")

    data = await consultar_dni_externo(numero)
    if not data:
        raise HTTPException(status_code=404, detail=f"DNI {numero} no encontrado en RENIEC.")

    nombre_completo = " ".join(
        parte for parte in (
            data.get("nombres", "").strip(),
            data.get("apellidoPaterno", "").strip(),
            data.get("apellidoMaterno", "").strip(),
        ) if parte
    )
    return {"dni": data.get("dni", numero), "nombreCompleto": nombre_completo}


@router.post("/ventas/subir")
@limiter.limit(UPLOAD_RATE_LIMIT)
async def subir_venta(
    request: Request,
    cliente: str = Form(...),
    dni: str = Form(...),
    celular: str = Form(...),
    correo: str = Form(...),
    fecha_venta: str = Form(...),
    monto_total: str = Form(...),
    monto_depositado: str = Form(...),
    operacion: str = Form(...),
    entidad: str = Form(...),
    cuotas: str = Form(...),
    cuotas_otro: str = Form(""),
    producto: str = Form(...),
    especialidad: str = Form(...),
    observaciones: str = Form(""),
    comprobante: UploadFile = File(...),
    user: dict = Depends(get_dashboard_user),
):
    if not comprobante.filename:
        return {"success": False, "error": "Debes adjuntar el comprobante de pago."}

    try:
        content = await comprobante.read()
        comprobante_url = await asyncio.to_thread(save_comprobante, content, comprobante.filename)
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        _log.error("Error subiendo comprobante de venta: %s", exc, exc_info=True)
        return {"success": False, "error": "No se pudo guardar el comprobante."}

    payload = {
        "cliente": cliente,
        "dni": dni,
        "celular": celular,
        "correo": correo,
        "fecha_venta": fecha_venta,
        "monto_total": monto_total,
        "monto_depositado": monto_depositado,
        "operacion": operacion,
        "entidad": entidad,
        "cuotas": cuotas,
        "cuotas_otro": cuotas_otro,
        "producto": producto,
        "especialidad": especialidad,
        "observaciones": observaciones,
    }
    return dashboard_service.submit_venta(user, payload, comprobante_url)


@router.post("/serums/subir")
@limiter.limit(UPLOAD_RATE_LIMIT)
async def subir_serums(
    request: Request,
    cliente: str = Form(...),
    dni: str = Form(...),
    celular: str = Form(...),
    correo: str = Form(...),
    fecha_venta: str = Form(...),
    monto_total: str = Form(...),
    monto_depositado: str = Form(...),
    operacion: str = Form(...),
    entidad: str = Form(...),
    cuotas: str = Form(...),
    cuotas_otro: str = Form(""),
    especialidad: str = Form(...),
    sub_especialidad: str = Form(""),
    observaciones: str = Form(""),
    comprobante: UploadFile = File(...),
    user: dict = Depends(get_dashboard_user),
):
    if not comprobante.filename:
        return {"success": False, "error": "Debes adjuntar el comprobante de pago."}

    try:
        content = await comprobante.read()
        comprobante_url = await asyncio.to_thread(save_serums_comprobante, content, comprobante.filename)
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        _log.error("Error subiendo comprobante de serums: %s", exc, exc_info=True)
        return {"success": False, "error": "No se pudo guardar el comprobante."}

    payload = {
        "cliente": cliente,
        "dni": dni,
        "celular": celular,
        "correo": correo,
        "fecha_venta": fecha_venta,
        "monto_total": monto_total,
        "monto_depositado": monto_depositado,
        "operacion": operacion,
        "entidad": entidad,
        "cuotas": cuotas,
        "cuotas_otro": cuotas_otro,
        "especialidad": especialidad,
        "sub_especialidad": sub_especialidad,
        "observaciones": observaciones,
    }
    return dashboard_service.submit_serums(user, payload, comprobante_url)


@router.post("/certificados/subir")
@limiter.limit(UPLOAD_RATE_LIMIT)
async def subir_certificado(
    request: Request,
    cliente: str = Form(...),
    dni: str = Form(...),
    celular: str = Form(...),
    correo: str = Form(...),
    fecha_venta: str = Form(...),
    monto_total: str = Form(...),
    monto_depositado: str = Form(...),
    operacion: str = Form(...),
    entidad: str = Form(...),
    cuotas: str = Form(...),
    cuotas_otro: str = Form(""),
    producto: str = Form(...),
    especialidad: str = Form(...),
    observaciones: str = Form(""),
    dni_receptor: str = Form(...),
    celular_receptor: str = Form(...),
    tipo_documento: str = Form(...),
    fecha_documento: str = Form(...),
    fecha_documento_otro: str = Form(""),
    horas: str = Form(...),
    tipo_envio: str = Form(...),
    validado_por: str = Form(...),
    codigo: str = Form(...),
    menciones: str = Form(...),
    otras_menciones: str = Form(""),
    departamento: str = Form(...),
    comprobante: UploadFile = File(...),
    dni_scan: UploadFile = File(...),
    user: dict = Depends(get_dashboard_user),
):
    """Igual que ventas: datos + archivos en una sola petición multipart."""
    if not comprobante.filename:
        return {"success": False, "error": "Debes adjuntar el comprobante de pago."}
    if not dni_scan.filename:
        return {"success": False, "error": "Debes adjuntar el DNI del cliente."}

    try:
        comp_content = await comprobante.read()
        dni_content = await dni_scan.read()
        comprobante_url, dni_scan_url = await asyncio.gather(
            asyncio.to_thread(save_certificado_comprobante, comp_content, comprobante.filename),
            asyncio.to_thread(save_dni_cliente, dni_content, dni_scan.filename),
        )
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        _log.error("Error subiendo archivos certificado: %s", exc, exc_info=True)
        return {"success": False, "error": "No se pudo subir los archivos a Google Drive."}

    try:
        payload = {
            "cliente": cliente,
            "dni": dni,
            "celular": celular,
            "correo": correo,
            "fecha_venta": fecha_venta,
            "monto_total": monto_total,
            "monto_depositado": monto_depositado,
            "operacion": operacion,
            "entidad": entidad,
            "cuotas": cuotas,
            "cuotas_otro": cuotas_otro,
            "producto": producto,
            "especialidad": especialidad,
            "observaciones": observaciones,
            "dni_receptor": dni_receptor,
            "celular_receptor": celular_receptor,
            "tipo_documento": tipo_documento,
            "fecha_documento": fecha_documento,
            "fecha_documento_otro": fecha_documento_otro,
            "horas": horas,
            "tipo_envio": tipo_envio,
            "validado_por": validado_por,
            "codigo": codigo,
            "menciones": menciones,
            "otras_menciones": otras_menciones,
            "departamento": departamento,
        }
        return await asyncio.to_thread(
            dashboard_service.submit_certificado,
            user,
            payload,
            comprobante_url,
            dni_scan_url,
        )
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        _log.error("Error en subir_certificado: %s", exc, exc_info=True)
        return {"success": False, "error": "No se pudo registrar el certificado. Intenta de nuevo."}


@router.get("/menciones")
async def menciones(
    q: str = "",
    especialidad: str = "",
    p_certificado: str = "",
    page: int = 1,
    per_page: int = 15,
    q_nro_mencion_only: bool = False,
    user: dict = Depends(get_dashboard_user),
):
    return dashboard_service.get_menciones(
        q, especialidad, p_certificado, page, per_page, q_nro_mencion_only
    )


@router.get("/admin/asesores")
async def admin_asesores(admin_user: dict = Depends(get_admin_user)):
    return {"asesores": dashboard_service.get_admin_asesores(), "admin": admin_user}


@router.get("/admin/asesores/{email}")
async def admin_asesor_detail(email: str, admin_user: dict = Depends(get_admin_user)):
    asesor = dashboard_service.get_admin_asesor(email)
    if not asesor:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return {"asesor": asesor, "admin": admin_user}


@router.post("/admin/asesores")
async def admin_asesor_create(
    body: AsesorCreateBody,
    admin_user: dict = Depends(get_admin_user),
):
    result = dashboard_service.create_admin_asesor(body.model_dump())
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al crear usuario."))
    return result


@router.put("/admin/asesores/{email}")
async def admin_asesor_update(
    email: str,
    body: AsesorUpdateBody,
    admin_user: dict = Depends(get_admin_user),
):
    payload = body.model_dump(exclude_unset=True)
    result = dashboard_service.update_admin_asesor(email, payload)
    if not result.get("success"):
        status = 404 if "no encontrado" in (result.get("error") or "").lower() else 400
        raise HTTPException(status_code=status, detail=result.get("error", "Error al actualizar."))
    return result


@router.delete("/admin/asesores/{email}")
async def admin_asesor_delete(
    email: str,
    admin_user: dict = Depends(get_admin_user),
):
    admin_email = (admin_user.get("email") or "").strip()
    result = dashboard_service.delete_admin_asesor(email, admin_email)
    if not result.get("success"):
        status = 404 if "no encontrado" in (result.get("error") or "").lower() else 400
        raise HTTPException(status_code=status, detail=result.get("error", "Error al eliminar."))
    return result
