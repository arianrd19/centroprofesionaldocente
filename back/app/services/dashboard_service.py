import logging

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.core.dashboard_auth import (
    build_session_user,
    hash_password,
    load_session_user_from_email,
    safe_float,
    safe_int,
)
from app.core.dashboard_auth import _norm_commission_to_float
from app.core.dashboard_sheets import gs_service

_log = logging.getLogger(__name__)

LIMA_TZ = ZoneInfo("America/Lima")


def _now_lima() -> datetime:
    """Hora actual en Lima. El servidor (Render) corre en UTC; sin esto la
    'Marca temporal' de ventas/serums/certificados queda 5 horas adelantada."""
    return datetime.now(LIMA_TZ)


def _today_lima() -> date:
    return _now_lima().date()


MESES = {
    "ENERO": 1,
    "FEBRERO": 2,
    "MARZO": 3,
    "ABRIL": 4,
    "MAYO": 5,
    "JUNIO": 6,
    "JULIO": 7,
    "AGOSTO": 8,
    "SEPTIEMBRE": 9,
    "SETIEMBRE": 9,
    "OCTUBRE": 10,
    "NOVIEMBRE": 11,
    "DICIEMBRE": 12,
}

MESES_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]

# ventas.py constants
COL_TIMESTAMP = "Marca temporal"
COL_PERSONAL = "PERSONAL"
COL_CLIENTE = "NOMBRE COMPLETO DEL CLIENTE"
COL_DNI = "DNI DEL CLIENTE"
COL_CELULAR = "CELULAR DEL CLIENTE"
COL_CORREO = "CORREO DEL CLIENTE"
COL_FECHA = "FECHA DE LA VENTA"
COL_MONTO_TOTAL = "MONTO TOTAL DE LA VENTA"
COL_MONTO_VENTA = "MONTO DE LA VENTA"
COL_DEPOSITADO = "MONTO DEPOSITADO"
COL_COMP = "COMPROBANTE DE PAGO"
COL_OPERACION = "NUMERO DE OPERACIÓN"
COL_OPERACION_ALT = "NÚMERO DE OPERACIÓN"
COL_ENTIDAD = "ENTIDAD FINANCIERA"
COL_CUOTAS = "CUOTAS"
COL_PRODUCTO = "TIPO DE PRODUCTO"
COL_PRODUCTO_ALT = "TPO DE PRODUCTO"
COL_ESPECIALIDAD = "ESPECIALIDAD"
COL_SUB_ESPECIALIDAD_TM = "SUB ESPECIALIDAD DE TECNOLOGÍA MÉDICA"
COL_OBS = "OBSERVACIONES"
COL_DNI_RECEPTOR = "DNI DEL RECEPTOR DEL DOCUMENTO"
COL_CELULAR_RECEPTOR = "CELULAR DEL RECEPTOR DEL DOCUMENTO"
COL_TIPO_DOC = "TIPO DE DOCUMENTO"
COL_FECHA_DOC = "FECHA DE DOCUMENTO"
COL_HORAS = "HORAS PEDAGÓGICAS"
COL_VALIDADO = "VALIDADO POR:"
COL_CODIGO = "CODIGO"
COL_MENCIONES = "MENCIONES"
COL_MENCIONES_CERT = "MENCIONES [CERTIFICADOS ACTUALIZACIÓN]"
COL_OTRAS_MENCIONES = "OTRAS MENCIONES"
COL_DEPARTAMENTO = "DEPARTAMENTO / PROVINCIA / DISTRITO"
COL_TIPO_ENVIO = "TIPO DE ENVIO"
COL_TIPO_ENVIO_ALT = "TIPO DE ENVÍO"
COL_DNI_SCAN = "DNI DEL CLIENTE(PARA SUBIR IMAGEN O PDF)"


def _sheets_config() -> Dict[str, Any]:
    return {"SHEETS": settings.SHEETS}


def _month_bounds(y: int, m: int) -> tuple[date, date]:
    first = date(y, m, 1)
    if m == 12:
        next_first = date(y + 1, 1, 1)
    else:
        next_first = date(y, m + 1, 1)
    return first, next_first - timedelta(days=1)


def _bounds_from_monthly_ws(tab_title: str) -> tuple[date, date, str]:
    """
    Deduce el rango del mes desde el nombre de la hoja mensual.
    Soporta: JULIO-2026, CERTIFICADOS JULIO-2026, SERUMS JULIO-2026
    """
    try:
        prefix, anio_str = tab_title.rsplit("-", 1)
        y = int(anio_str.strip())
        mes_nombre = prefix.strip().upper().split()[-1]
        m = MESES[mes_nombre]
        d_start, d_end = _month_bounds(y, m)
        month_label = f"{MESES_ES[m - 1].capitalize()} {y}"
        return d_start, d_end, month_label
    except Exception:
        today = _today_lima()
        d_start, d_end = _month_bounds(today.year, today.month)
        return d_start, d_end, _formatear_mes_anio(today)


def _bounds_from_tab(tab_title: str) -> tuple[date, date, str]:
    """Alias retrocompatible."""
    return _bounds_from_monthly_ws(tab_title)


def _month_range_today() -> tuple[date, date, date]:
    today = _today_lima()
    first = today.replace(day=1)
    if today.month == 12:
        next_first = date(today.year + 1, 1, 1)
    else:
        next_first = date(today.year, today.month + 1, 1)
    return today, first, next_first - timedelta(days=1)


def _formatear_mes_anio(fecha: date) -> str:
    return f"{MESES_ES[fecha.month - 1].capitalize()} {fecha.year}"


def _try_parse_date(value: Any) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if value in (None, ""):
        return None

    s = str(value).strip()
    if not s:
        return None

    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except Exception:
            continue

    try:
        return datetime.fromisoformat(s[:19]).date()
    except Exception:
        return None


def _to_iso(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()

    parsed = _try_parse_date(value)
    if parsed is not None:
        return parsed.isoformat()
    return value


def _serialize_dates(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _serialize_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_dates(v) for v in obj]
    return _to_iso(obj)


def _extraer_fecha_venta(v: Any) -> datetime:
    f = getattr(v, "fecha", None)
    if f is None and isinstance(v, dict):
        f = v.get("fecha")

    if isinstance(f, datetime):
        return f
    if isinstance(f, date):
        return datetime.combine(f, datetime.min.time())
    if isinstance(f, str):
        s = f.strip()
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(s, fmt)
            except Exception:
                continue
    return datetime.min


def _only_digits(s: str) -> str:
    return "".join(ch for ch in (s or "") if ch.isdigit())


def _fecha_spanish(dt: datetime) -> str:
    return f"{dt.day:02d} de {MESES_ES[dt.month - 1]} de {dt.year}"


def _formatea_fecha(value: Any) -> str:
    if value in (None, ""):
        return ""

    if isinstance(value, datetime):
        return _fecha_spanish(value)
    if isinstance(value, date):
        return _fecha_spanish(datetime(value.year, value.month, value.day))

    s = str(value).strip()
    try:
        dt = datetime.fromisoformat(s[:19])
        return _fecha_spanish(dt)
    except Exception:
        pass

    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d", "%d/%m/%y"):
        try:
            dt = datetime.strptime(s[:10], fmt)
            return _fecha_spanish(dt)
        except Exception:
            continue

    if s.isdigit():
        if len(s) == 8:
            try:
                y, m, d = int(s[0:4]), int(s[4:6]), int(s[6:8])
                return _fecha_spanish(datetime(y, m, d))
            except Exception:
                pass
        try:
            ts = int(s)
            if ts > 1_000_000_000_000:
                ts = ts / 1000.0
            if 946684800 <= ts <= 4102444800:
                return _fecha_spanish(datetime.fromtimestamp(ts))
        except Exception:
            pass
        try:
            serial = int(s)
            if 20000 < serial < 60000:
                base = datetime(1899, 12, 30)
                return _fecha_spanish(base + timedelta(days=serial))
        except Exception:
            pass

    return s


def _row_to_view(row: Dict[str, Any]) -> Dict[str, Any]:
    fecha_raw = row.get(COL_FECHA) or row.get(COL_TIMESTAMP) or ""
    es_certificado = COL_MENCIONES in row or COL_HORAS in row or COL_CODIGO in row
    monto_total = row.get(COL_MONTO_TOTAL, "") or row.get(COL_MONTO_VENTA, "")
    operacion = row.get(COL_OPERACION, "") or row.get(COL_OPERACION_ALT, "")
    producto = row.get(COL_PRODUCTO, "") or row.get(COL_PRODUCTO_ALT, "")

    resultado = {
        "fecha_venta": _to_iso(fecha_raw),
        "fecha_venta_fmt": _formatea_fecha(fecha_raw),
        "cliente": row.get(COL_CLIENTE, ""),
        "dni": str(row.get(COL_DNI, "")).strip(),
        "celular": str(row.get(COL_CELULAR, "")).strip(),
        "monto_total": monto_total,
        "monto_depositado": row.get(COL_DEPOSITADO, ""),
        "comprobante": row.get(COL_COMP, ""),
        "operacion": operacion,
        "entidad": row.get(COL_ENTIDAD, ""),
        "cuotas": row.get(COL_CUOTAS, ""),
        "producto": producto,
        "especialidad": row.get(COL_ESPECIALIDAD, ""),
        "asesor": row.get(COL_PERSONAL, ""),
        "marca_temporal": _to_iso(row.get(COL_TIMESTAMP, "")),
        "tipo": "CERTIFICADO" if es_certificado else "CURSO",
    }

    if not es_certificado:
        resultado["correo"] = row.get(COL_CORREO, "")
        resultado["observaciones"] = row.get(COL_OBS, "")
    else:
        resultado["dni_receptor"] = row.get(COL_DNI_RECEPTOR, "")
        resultado["celular_receptor"] = row.get(COL_CELULAR_RECEPTOR, "")
        resultado["tipo_documento"] = row.get(COL_TIPO_DOC, "")
        resultado["fecha_documento"] = _to_iso(row.get(COL_FECHA_DOC, ""))
        resultado["horas"] = row.get(COL_HORAS, "")
        resultado["validado_por"] = row.get(COL_VALIDADO, "")
        resultado["codigo"] = row.get(COL_CODIGO, "")
        resultado["menciones"] = row.get(COL_MENCIONES, "")
        resultado["departamento"] = row.get(COL_DEPARTAMENTO, "")
        resultado["correo"] = ""
        resultado["observaciones"] = ""

    return resultado


def refresh_user_from_sheets(email: str) -> Dict[str, Any]:
    email = (email or "").strip()
    if not email:
        return {}

    session_user = load_session_user_from_email(email)
    if session_user:
        return _serialize_dates(session_user)

    try:
        record = gs_service.find_record(
            book_name="credenciales",
            worksheet_name="usuarios",
            column="Email",
            value=email,
        )
        if not record:
            return {}
        return _serialize_dates(build_session_user(record))
    except Exception:
        return {}


def get_home_data(user_email: str) -> Dict[str, Any]:
    user = refresh_user_from_sheets(user_email) if user_email else {}
    leaderboard: List[Dict[str, Any]] = []
    total_registros = 0
    error_fuente = None

    try:
        credenciales = gs_service.get_all_records(
            book_name="credenciales",
            worksheet_name="usuarios",
        )
        usuarios = []
        for row in credenciales:
            volumen_val = row.get("VOLUMEN")
            if volumen_val is not None and str(volumen_val).strip() != "":
                try:
                    usuarios.append(
                        {
                            "nombre": row.get("Nombres y Apellidos", ""),
                            "posicion": int(row.get("Posicion", 0))
                            if str(row.get("Posicion", "")).strip().isdigit()
                            else 0,
                            "volumen": safe_float(volumen_val, default=0.0),
                            "codigo": row.get("Codigo", ""),
                        }
                    )
                except Exception:
                    continue

        usuarios_ordenados = sorted(usuarios, key=lambda x: x["volumen"], reverse=True)
        for idx, u in enumerate(usuarios_ordenados, start=1):
            u["posicion"] = idx

        usuario_actual = next(
            (u for u in usuarios_ordenados if u["codigo"] == user.get("codigo")),
            None,
        )

        if usuarios_ordenados:
            primero = usuarios_ordenados[0]
            if usuario_actual:
                idx = usuarios_ordenados.index(usuario_actual)
                if idx == 0:
                    leaderboard = usuarios_ordenados[:3]
                else:
                    leaderboard.append(primero)
                    usados = {primero["codigo"]}
                    if usuario_actual["codigo"] not in usados:
                        leaderboard.append(usuario_actual)
                        usados.add(usuario_actual["codigo"])
                    next_idx = idx + 1
                    if next_idx < len(usuarios_ordenados):
                        siguiente = usuarios_ordenados[next_idx]
                        if siguiente["codigo"] not in usados:
                            leaderboard.append(siguiente)
            else:
                leaderboard = usuarios_ordenados[:3]

        if usuario_actual:
            user["posicion"] = usuario_actual["posicion"]
    except Exception:
        leaderboard = []

    try:
        datos = gs_service.get_all_records(book_name="datos", worksheet_name="datos")
        total_registros = len(datos)
    except Exception:
        error_fuente = "datos"
        try:
            datos = gs_service.get_all_records(book_name="cursos", worksheet_name="registro")
            total_registros = len(datos)
            error_fuente = None
        except Exception:
            try:
                datos = gs_service.get_all_records(book_name="ventas", worksheet_name="registro")
                total_registros = len(datos)
                error_fuente = None
            except Exception:
                total_registros = 0

    return _serialize_dates(
        {
            "user": user,
            "total_registros": total_registros,
            "now": _now_lima(),
            "leaderboard": leaderboard,
            "warning": "Libro 'datos' no configurado, usando otra fuente."
            if error_fuente == "datos"
            else None,
        }
    )


def get_admin_home_data() -> Dict[str, Any]:
    """Estadisticas agregadas de TODOS los asesores (solo admin): ventas del
    mes en curso (cursos + certificados + serums) y leaderboard completo."""
    tab_title = settings.SHEETS["cursos"]["worksheets"]["registro"]
    d_start, d_end, month_label = _bounds_from_monthly_ws(tab_title)
    cfg = _sheets_config()

    error = None
    try:
        cursos_stats = gs_service.get_all_sales(d_start, d_end, cfg)
    except Exception as exc:
        cursos_stats = {"count": 0, "total_monto": 0.0, "ventas": []}
        error = f"Error al cargar ventas: {exc}"
    try:
        cert_stats = gs_service.get_all_certificates(d_start, d_end, cfg)
    except Exception as exc:
        cert_stats = {"count": 0, "total_monto": 0.0, "certificados": []}
        error = f"{error}; Error al cargar certificados: {exc}" if error else f"Error al cargar certificados: {exc}"
    try:
        serums_stats = gs_service.get_all_serums(d_start, d_end, cfg)
    except Exception as exc:
        serums_stats = {"count": 0, "total_monto": 0.0, "ventas": []}
        error = f"{error}; Error al cargar serums: {exc}" if error else f"Error al cargar serums: {exc}"

    count_cursos = cursos_stats.get("count", 0)
    total_cursos = cursos_stats.get("total_monto", 0.0)
    count_certificados = cert_stats.get("count", 0)
    total_certificados = cert_stats.get(
        "total_monto",
        sum(c.get("monto_depositado", 0) for c in cert_stats.get("certificados", [])),
    )
    count_serums = serums_stats.get("count", 0)
    total_serums = serums_stats.get("total_monto", 0.0)

    count = count_cursos + count_certificados + count_serums
    total = round(total_cursos + total_certificados + total_serums, 2)

    leaderboard: List[Dict[str, Any]] = []
    try:
        credenciales = gs_service.get_all_records(book_name="credenciales", worksheet_name="usuarios")
        usuarios = []
        for row in credenciales:
            volumen_val = row.get("VOLUMEN")
            if volumen_val is not None and str(volumen_val).strip() != "":
                try:
                    usuarios.append(
                        {
                            "nombre": row.get("Nombres y Apellidos", ""),
                            "volumen": safe_float(volumen_val, default=0.0),
                            "ventas": safe_int(row.get("VENTAS"), default=0),
                            "codigo": row.get("Codigo", ""),
                            "estado": row.get("Estado", ""),
                        }
                    )
                except Exception:
                    continue
        usuarios_ordenados = sorted(usuarios, key=lambda x: x["volumen"], reverse=True)
        for idx, u in enumerate(usuarios_ordenados, start=1):
            u["posicion"] = idx
        leaderboard = usuarios_ordenados
    except Exception:
        leaderboard = []

    return _serialize_dates(
        {
            "month": month_label,
            "now": _now_lima(),
            "count": count,
            "total": total,
            "count_cursos": count_cursos,
            "total_cursos": total_cursos,
            "count_certificados": count_certificados,
            "total_certificados": total_certificados,
            "count_serums": count_serums,
            "total_serums": total_serums,
            "total_asesores": len(leaderboard),
            "leaderboard": leaderboard,
            "error": error,
        }
    )


def _resolve_periodo(anio: Optional[int], mes: Optional[int], nofilter: bool):
    tab_title = settings.SHEETS["cursos"]["worksheets"]["registro"]
    if nofilter:
        return date(1900, 1, 1), date(2999, 12, 31), "Todos"
    if anio and mes:
        try:
            d_start, d_end = _month_bounds(int(anio), int(mes))
            return d_start, d_end, f"{MESES_ES[int(mes) - 1].capitalize()} {int(anio)}"
        except Exception:
            pass
    return _bounds_from_monthly_ws(tab_title)


def get_admin_mi_dashboard_data(
    anio: Optional[int],
    mes: Optional[int],
    nofilter: bool,
) -> Dict[str, Any]:
    """Igual que get_mi_dashboard_data pero sin filtrar por asesor (solo admin):
    ventas de cursos/certificados/serums de TODOS los asesores en el periodo."""
    d_start, d_end, month_label = _resolve_periodo(anio, mes, nofilter)
    cfg = _sheets_config()

    cursos_stats = gs_service.get_all_sales(d_start, d_end, cfg)
    cert_stats = gs_service.get_all_certificates(d_start, d_end, cfg)
    serums_stats = gs_service.get_all_serums(d_start, d_end, cfg)

    count_cursos = cursos_stats.get("count", 0)
    total_cursos = cursos_stats.get("total_monto", 0.0)
    count_certificados = cert_stats.get("count", 0)
    total_certificados = cert_stats.get(
        "total_monto",
        sum(c.get("monto_depositado", 0) for c in cert_stats.get("certificados", [])),
    )
    count_serums = serums_stats.get("count", 0)
    total_serums = serums_stats.get("total_monto", 0.0)

    count = count_cursos + count_certificados + count_serums
    total = round(total_cursos + total_certificados + total_serums, 2)

    ventas_cursos = cursos_stats.get("ventas", [])
    ventas_serums = serums_stats.get("ventas", [])

    return _serialize_dates(
        {
            "username": "Todos los asesores",
            "month": month_label,
            "count": count,
            "total": total,
            "codigo": "",
            "all_asesores": True,
            "nofilter": bool(nofilter),
            "d_start": d_start,
            "d_end": d_end,
            "cert_count": cert_stats.get("count", 0),
            "ultimos_certificados": cert_stats.get("certificados", []),
            "count_cursos": count_cursos,
            "total_cursos": total_cursos,
            "count_certificados": count_certificados,
            "total_certificados": total_certificados,
            "count_serums": count_serums,
            "total_serums": total_serums,
            "ultimas": ventas_cursos,
            "ultimas_cursos": ventas_cursos,
            "ultimos_serums": ventas_serums,
            "ventas_cursos": ventas_cursos,
            "ventas_serums": ventas_serums,
            "error": None,
        }
    )


def get_mi_dashboard_data(
    user_dict: Dict[str, Any],
    anio: Optional[int],
    mes: Optional[int],
    codigo_override: str,
    nofilter: bool,
) -> Dict[str, Any]:
    user = dict(user_dict or {})
    username = (user.get("name") or user.get("nombre") or "").strip()
    user_email = (user.get("email") or user.get("correo") or "").strip()

    refreshed = refresh_user_from_sheets(user_email)
    if refreshed:
        user.update(refreshed)

    if (user.get("role") or "").strip().lower() == "admin" and not codigo_override:
        return get_admin_mi_dashboard_data(anio, mes, nofilter)

    d_start, d_end, month_label = _resolve_periodo(anio, mes, nofilter)

    codigo = (user.get("codigo") or "").strip()
    if codigo_override:
        codigo = codigo_override.strip()
    if not codigo:
        key_for_lookup = user_email or username
        if key_for_lookup:
            codigo = gs_service.get_user_code(key_for_lookup, _sheets_config())

    cursos_stats = {"count": 0, "total_monto": 0.0, "ventas": []}
    cert_stats = {"count": 0, "total_monto": 0.0, "certificados": []}
    serums_stats = {"count": 0, "total_monto": 0.0, "ventas": []}
    pct = 0.0
    error = None

    if not codigo:
        error = "No se encontro el codigo del usuario en credenciales."
    else:
        cfg = _sheets_config()
        cursos_stats = gs_service.get_sales_by_code(codigo, d_start, d_end, cfg)
        pct = user.get("comision")
        if pct is None:
            key_for_lookup = user_email or username
            pct = gs_service.get_user_commission_pct(key_for_lookup, cfg)
        try:
            cert_stats = gs_service.get_certificates_by_code(codigo, d_start, d_end, cfg)
        except Exception as exc:
            error = f"Error al cargar certificados: {exc}"
        try:
            serums_stats = gs_service.get_serums_by_code(codigo, d_start, d_end, cfg)
        except Exception as exc:
            serums_err = f"Error al cargar serums: {exc}"
            error = f"{error}; {serums_err}" if error else serums_err

    count_cursos = cursos_stats.get("count", 0)
    total_cursos = cursos_stats.get("total_monto", 0.0)
    count_certificados = cert_stats.get("count", 0)
    total_certificados = cert_stats.get(
        "total_monto",
        sum(c.get("monto_depositado", 0) for c in cert_stats.get("certificados", [])),
    )
    count_serums = serums_stats.get("count", 0)
    total_serums = serums_stats.get("total_monto", 0.0)

    count = count_cursos + count_certificados + count_serums
    total = round(total_cursos + total_certificados + total_serums, 2)

    ventas_cursos = cursos_stats.get("ventas", [])
    ventas_serums = serums_stats.get("ventas", [])

    comision_cursos = round(total_cursos * 0.20, 2)
    comision_certificados = round(total_certificados * 0.15, 2)
    comision_serums = round(total_serums * 0.20, 2)
    commission = round(comision_cursos + comision_certificados + comision_serums, 2)

    # Se devuelve el listado completo del periodo; la paginacion la hace el frontend.
    ultimas_cursos = ventas_cursos
    ultimos_serums = ventas_serums
    ultimos_certificados = cert_stats.get("certificados", [])

    return _serialize_dates(
        {
            "username": username or user_email or "Usuario",
            "month": month_label,
            "count": count,
            "total": total,
            "commission": commission,
            "pct": int((pct or 0.0) * 100),
            "codigo": codigo,
            "nofilter": bool(nofilter),
            "posicion": user.get("posicion"),
            "volumen_cred": user.get("volumen"),
            "ventas_cred": user.get("ventas"),
            "d_start": d_start,
            "d_end": d_end,
            "cert_count": cert_stats.get("count", 0),
            "ultimos_certificados": ultimos_certificados,
            "count_cursos": count_cursos,
            "total_cursos": total_cursos,
            "count_certificados": count_certificados,
            "total_certificados": total_certificados,
            "count_serums": count_serums,
            "total_serums": total_serums,
            "ultimas": ultimas_cursos,
            "ultimas_cursos": ultimas_cursos,
            "ultimos_serums": ultimos_serums,
            "ventas_cursos": ventas_cursos,
            "ventas_serums": ventas_serums,
            "error": error,
        }
    )


def get_cobranza_data(
    user_dict: Dict[str, Any],
    codigo_override: str,
    nofilter: bool,
) -> Dict[str, Any]:
    user = dict(user_dict or {})
    username = (user.get("name") or user.get("nombre") or "").strip()
    user_email = (user.get("email") or user.get("correo") or "").strip()

    today, first_day, last_day = _month_range_today()
    if nofilter:
        first_day = date(1900, 1, 1)
        last_day = date(2999, 12, 31)

    codigo = (user.get("codigo") or "").strip()
    if codigo_override:
        codigo = codigo_override.strip()
    if not codigo:
        codigo = gs_service.get_user_code((user_email or username), _sheets_config())

    if not codigo:
        return {
            "cobranzas": [],
            "codigo": "",
            "nofilter": bool(nofilter),
            "username": username or "Usuario",
            "month": _formatear_mes_anio(today),
            "error": "No se encontro el codigo del usuario en credenciales.",
        }

    stats = gs_service.get_cobranzas_by_code(codigo, first_day, last_day, _sheets_config())
    return _serialize_dates(
        {
            "cobranzas": stats.get("cobranzas", []),
            "count": stats.get("count", 0),
            "total_monto": stats.get("total_monto", 0.0),
            "codigo": codigo,
            "nofilter": bool(nofilter),
            "username": username or "Usuario",
            "month": _formatear_mes_anio(today),
            "d_start": first_day,
            "d_end": last_day,
        }
    )


def search_ventas(q: str, tipo: str) -> Dict[str, Any]:
    q = (q or "").strip()
    tipo = (tipo or "dni").lower()
    resultados = []

    try:
        if q:
            q_digits = _only_digits(q)
            rows_cursos = gs_service.get_all_records(book_name="ventas", worksheet_name="cursos")
            rows_certificados = gs_service.get_all_records(
                book_name="ventas", worksheet_name="certificados"
            )
            all_rows = rows_cursos + rows_certificados

            for r in all_rows:
                dni_digits = _only_digits(str(r.get(COL_DNI, "")))
                cel_digits = _only_digits(str(r.get(COL_CELULAR, "")))

                if tipo == "dni":
                    match = (q_digits == dni_digits) or (q_digits and q_digits in dni_digits)
                elif tipo == "celular":
                    match = (q_digits == cel_digits) or (q_digits and q_digits in cel_digits)
                else:
                    match = q_digits and (q_digits in dni_digits or q_digits in cel_digits)

                if match:
                    resultados.append(_row_to_view(r))

        return {
            "success": True,
            "q": q,
            "tipo": tipo,
            "total": len(resultados),
            "data": _serialize_dates(resultados),
        }
    except Exception as exc:
        return {"success": False, "q": q, "tipo": tipo, "error": str(exc), "total": 0, "data": []}


def get_menciones(
    q: str,
    especialidad: str,
    p_certificado: str,
    page: int,
    per_page: int = 15,
    q_nro_mencion_only: bool = False,
) -> Dict[str, Any]:
    q = q or ""
    especialidad = especialidad or ""
    p_certificado = p_certificado or ""
    page = int(page or 1)
    per_page = max(1, min(int(per_page or 15), 50))

    all_results = gs_service.search_mentions(
        _sheets_config(),
        q=q or None,
        especialidad=especialidad or None,
        p_certificado=p_certificado or None,
        limit=None,
        q_nro_mencion_only=q_nro_mencion_only,
    )

    especialidades = sorted(
        list({r.get("especialidad") for r in all_results if r.get("especialidad")})
    )
    p_certificados = sorted(
        list({r.get("p_certificado") for r in all_results if r.get("p_certificado")})
    )

    total = len(all_results)
    total_pages = (total + per_page - 1) // per_page
    page = max(1, min(page, total_pages or 1))

    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_results = all_results[start_idx:end_idx]

    query_params = {"q": q, "especialidad": especialidad, "p_certificado": p_certificado}
    query_params_prev = {**query_params, "page": page - 1} if page > 1 else {}
    query_params_next = {**query_params, "page": page + 1} if page < total_pages else {}

    pagination = {
        "page": page,
        "pages": total_pages,
        "total": total,
        "start": start_idx + 1 if total > 0 else 0,
        "end": min(end_idx, total),
        "query_prev": urlencode({k: v for k, v in query_params_prev.items() if v}),
        "query_next": urlencode({k: v for k, v in query_params_next.items() if v}),
        "has_prev": page > 1,
        "has_next": page < total_pages,
    }

    return _serialize_dates(
        {
            "q": q,
            "especialidad": especialidad,
            "p_certificado": p_certificado,
            "especialidades": especialidades,
            "p_certificados": p_certificados,
            "rows": paginated_results,
            "pagination": pagination,
        }
    )


def ensure_cliente_in_sheet(payload: Dict[str, Any]) -> None:
    """Si el DNI no existe en CLIENTES, lo registra con los datos del formulario.
    Si ya existe pero le falta nombre/celular/correo, completa solo lo que
    esté vacío con lo que llenó el asesor (no pisa datos ya cargados)."""
    from app.core.google_sheets import sheets_service

    dni = (payload.get("dni") or "").strip()
    if not dni:
        return
    try:
        existing = sheets_service.get_cliente_by_dni(dni)
        if not existing:
            sheets_service.create_cliente({
                "DNI DEL CLIENTE": dni,
                "NOMBRE COMPLETO DEL CLIENTE": (payload.get("cliente") or "").strip(),
                "CELULAR DEL CLIENTE": (payload.get("celular") or "").strip(),
                "CORREO DEL CLIENTE": (payload.get("correo") or "").strip(),
            })
            _log.info("Cliente nuevo registrado en CLIENTES: DNI %s", dni)
            return

        nombre_actual = str(
            existing.get("NOMBRE COMPLETO DEL CLIENTE", "") or existing.get("NOMBRES", "") or ""
        ).strip()
        celular_actual = str(
            existing.get("CELULAR DEL CLIENTE", "") or existing.get("TELEFONO", "") or ""
        ).strip()
        correo_actual = str(
            existing.get("CORREO DEL CLIENTE", "") or existing.get("EMAIL", "") or ""
        ).strip()

        faltantes = {}
        if not nombre_actual and (payload.get("cliente") or "").strip():
            faltantes["NOMBRE COMPLETO DEL CLIENTE"] = payload["cliente"].strip()
        if not celular_actual and (payload.get("celular") or "").strip():
            faltantes["CELULAR DEL CLIENTE"] = payload["celular"].strip()
        if not correo_actual and (payload.get("correo") or "").strip():
            faltantes["CORREO DEL CLIENTE"] = payload["correo"].strip()

        if faltantes:
            sheets_service.update_cliente(dni, faltantes)
            _log.info("Cliente %s completado en CLIENTES con: %s", dni, list(faltantes.keys()))
    except Exception as exc:
        _log.warning("No se pudo crear/actualizar cliente %s en CLIENTES: %s", dni, exc)


def submit_venta(
    user_dict: Dict[str, Any],
    payload: Dict[str, Any],
    comprobante_url: str = "",
) -> Dict[str, Any]:
    """Registra una venta en la hoja mensual de cursos."""
    user = dict(user_dict or {})
    email = (user.get("email") or "").strip()
    refreshed = refresh_user_from_sheets(email)
    if refreshed:
        user.update(refreshed)

    codigo = (user.get("codigo") or "").strip()
    if not codigo:
        return {"success": False, "error": "No se encontró el código del asesor en credenciales."}

    ensure_cliente_in_sheet(payload)

    personal = codigo
    ws_title = settings.SHEETS["cursos"]["worksheets"]["registro"]

    fecha_raw = (payload.get("fecha_venta") or "").strip()
    fecha_venta = fecha_raw
    if fecha_raw and "-" in fecha_raw:
        try:
            dt = datetime.strptime(fecha_raw[:10], "%Y-%m-%d")
            fecha_venta = dt.strftime("%d/%m/%Y")
        except Exception:
            pass

    cuotas = (payload.get("cuotas") or "").strip()
    if cuotas == "__OTRO__":
        cuotas = (payload.get("cuotas_otro") or "").strip()

    now = _now_lima()
    row = {
        COL_TIMESTAMP: now.strftime("%d/%m/%Y %H:%M:%S"),
        COL_PERSONAL: personal,
        COL_CLIENTE: (payload.get("cliente") or "").strip(),
        COL_DNI: (payload.get("dni") or "").strip(),
        COL_CELULAR: (payload.get("celular") or "").strip(),
        COL_CORREO: (payload.get("correo") or "").strip(),
        COL_FECHA: fecha_venta,
        COL_MONTO_TOTAL: (payload.get("monto_total") or "").strip(),
        COL_DEPOSITADO: (payload.get("monto_depositado") or "").strip(),
        COL_COMP: comprobante_url,
        COL_OPERACION: (payload.get("operacion") or "").strip(),
        COL_OPERACION_ALT: (payload.get("operacion") or "").strip(),
        COL_ENTIDAD: (payload.get("entidad") or "").strip(),
        COL_CUOTAS: cuotas,
        COL_PRODUCTO: (payload.get("producto") or "").strip(),
        COL_ESPECIALIDAD: (payload.get("especialidad") or "").strip(),
        COL_OBS: (payload.get("observaciones") or "").strip(),
    }

    ok = gs_service.append_record_dict("cursos", "registro", row)
    if not ok:
        return {"success": False, "error": "No se pudo guardar la venta en Google Sheets."}

    return {
        "success": True,
        "message": "Venta registrada correctamente.",
        "worksheet": ws_title,
        "personal": personal,
    }


def submit_serums(
    user_dict: Dict[str, Any],
    payload: Dict[str, Any],
    comprobante_url: str = "",
) -> Dict[str, Any]:
    """Registra una venta SERUMS en la hoja mensual correspondiente."""
    user = dict(user_dict or {})
    email = (user.get("email") or "").strip()
    refreshed = refresh_user_from_sheets(email)
    if refreshed:
        user.update(refreshed)

    codigo = (user.get("codigo") or "").strip()
    if not codigo:
        return {"success": False, "error": "No se encontró el código del asesor en credenciales."}

    ensure_cliente_in_sheet(payload)

    personal = codigo
    ws_title = settings.SHEETS["serums_mensual"]["worksheets"]["registro"]

    fecha_raw = (payload.get("fecha_venta") or "").strip()
    fecha_venta = fecha_raw
    if fecha_raw and "-" in fecha_raw:
        try:
            dt = datetime.strptime(fecha_raw[:10], "%Y-%m-%d")
            fecha_venta = dt.strftime("%d/%m/%Y")
        except Exception:
            pass

    cuotas = (payload.get("cuotas") or "").strip()
    if cuotas == "__OTRO__":
        cuotas = (payload.get("cuotas_otro") or "").strip()

    especialidad = (payload.get("especialidad") or "").strip()
    sub_especialidad = (payload.get("sub_especialidad") or "").strip()
    if not sub_especialidad:
        sub_especialidad = "NO APLICA"

    now = _now_lima()
    row = {
        COL_TIMESTAMP: now.strftime("%d/%m/%Y %H:%M:%S"),
        COL_PERSONAL: personal,
        COL_CLIENTE: (payload.get("cliente") or "").strip(),
        COL_DNI: (payload.get("dni") or "").strip(),
        COL_CELULAR: (payload.get("celular") or "").strip(),
        COL_CORREO: (payload.get("correo") or "").strip(),
        COL_FECHA: fecha_venta,
        COL_MONTO_TOTAL: (payload.get("monto_total") or "").strip(),
        COL_DEPOSITADO: (payload.get("monto_depositado") or "").strip(),
        COL_COMP: comprobante_url,
        COL_OPERACION: (payload.get("operacion") or "").strip(),
        COL_OPERACION_ALT: (payload.get("operacion") or "").strip(),
        COL_ENTIDAD: (payload.get("entidad") or "").strip(),
        COL_CUOTAS: cuotas,
        COL_ESPECIALIDAD: especialidad,
        COL_SUB_ESPECIALIDAD_TM: sub_especialidad,
        COL_OBS: (payload.get("observaciones") or "").strip(),
    }

    ok = gs_service.append_record_dict("serums_mensual", "registro", row)
    if not ok:
        return {"success": False, "error": "No se pudo guardar la venta SERUMS en Google Sheets."}

    return {
        "success": True,
        "message": "Venta SERUMS registrada correctamente.",
        "worksheet": ws_title,
        "personal": personal,
    }


def submit_certificado(
    user_dict: Dict[str, Any],
    payload: Dict[str, Any],
    comprobante_url: str = "",
    dni_scan_url: str = "",
) -> Dict[str, Any]:
    """Registra una venta de certificado en la hoja mensual de certificados."""
    user = dict(user_dict or {})
    email = (user.get("email") or "").strip()
    refreshed = refresh_user_from_sheets(email)
    if refreshed:
        user.update(refreshed)

    codigo = (user.get("codigo") or "").strip()
    if not codigo:
        return {"success": False, "error": "No se encontró el código del asesor en credenciales."}

    ensure_cliente_in_sheet(payload)

    personal = codigo
    ws_title = settings.SHEETS["certificados_mensual"]["worksheets"]["registro"]

    fecha_raw = (payload.get("fecha_venta") or "").strip()
    fecha_venta = fecha_raw
    if fecha_raw and "-" in fecha_raw:
        try:
            dt = datetime.strptime(fecha_raw[:10], "%Y-%m-%d")
            fecha_venta = dt.strftime("%d/%m/%Y")
        except Exception:
            pass

    cuotas = (payload.get("cuotas") or "").strip()
    if cuotas == "__OTRO__":
        cuotas = (payload.get("cuotas_otro") or "").strip()

    fecha_doc = (payload.get("fecha_documento") or "").strip()
    if fecha_doc == "__OTRO__":
        fecha_doc = (payload.get("fecha_documento_otro") or "").strip()

    monto = (payload.get("monto_total") or "").strip()
    tipo_envio = (payload.get("tipo_envio") or "").strip()

    now = _now_lima()
    row = {
        COL_TIMESTAMP: now.strftime("%d/%m/%Y %H:%M:%S"),
        COL_PERSONAL: personal,
        COL_CLIENTE: (payload.get("cliente") or "").strip(),
        COL_DNI: (payload.get("dni") or "").strip(),
        COL_CELULAR: (payload.get("celular") or "").strip(),
        COL_DNI_RECEPTOR: (payload.get("dni_receptor") or "").strip(),
        COL_CELULAR_RECEPTOR: (payload.get("celular_receptor") or "").strip(),
        COL_ESPECIALIDAD: (payload.get("especialidad") or "").strip(),
        COL_TIPO_DOC: (payload.get("tipo_documento") or "").strip(),
        COL_FECHA: fecha_venta,
        COL_MONTO_VENTA: monto,
        COL_DEPOSITADO: (payload.get("monto_depositado") or "").strip(),
        COL_COMP: comprobante_url,
        COL_OPERACION_ALT: (payload.get("operacion") or "").strip(),
        COL_ENTIDAD: (payload.get("entidad") or "").strip(),
        COL_CUOTAS: cuotas,
        COL_PRODUCTO_ALT: (payload.get("producto") or "").strip(),
        COL_FECHA_DOC: fecha_doc,
        COL_HORAS: (payload.get("horas") or "").strip(),
        COL_TIPO_ENVIO: tipo_envio,
        COL_TIPO_ENVIO_ALT: tipo_envio,
        "TIPO DE DOCUMENTO#2": tipo_envio,
        COL_VALIDADO: (payload.get("validado_por") or "").strip(),
        COL_CODIGO: (payload.get("codigo") or "").strip(),
        COL_MENCIONES_CERT: (payload.get("menciones") or "").strip(),
        COL_OTRAS_MENCIONES: (payload.get("otras_menciones") or "").strip(),
        COL_DEPARTAMENTO: (payload.get("departamento") or "").strip(),
        "DNI DEL CLIENTE#2": dni_scan_url,
    }

    ok = gs_service.append_record_dict("certificados_mensual", "registro", row)
    if not ok:
        return {"success": False, "error": "No se pudo guardar el certificado en Google Sheets."}

    return {
        "success": True,
        "message": "Certificado registrado correctamente.",
        "worksheet": ws_title,
        "personal": personal,
    }


def _cell_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def get_admin_asesores() -> List[Dict[str, Any]]:
    try:
        credenciales = gs_service.get_all_records(
            book_name="credenciales",
            worksheet_name="usuarios",
        )
        headers = _credencial_headers()
        return sorted(
            [
                _row_to_admin_user(row, headers)
                for row in credenciales
                if _cell_str(row.get(headers["email"]))
            ],
            key=lambda a: a["nombre"].lower(),
        )
    except Exception as exc:
        _log.warning("get_admin_asesores error: %s", exc)
        return []


def get_admin_asesor(email: str) -> Optional[Dict[str, Any]]:
    email = (email or "").strip()
    if not email:
        return None
    try:
        row = gs_service.find_record("credenciales", "usuarios", "Email", email)
        if not row:
            return None
        return _row_to_admin_user(row, _credencial_headers())
    except Exception:
        return None


def _credencial_headers() -> Dict[str, str]:
    """Resuelve nombres reales de columnas en CREDENCIALES."""
    records = gs_service.get_all_records("credenciales", "usuarios")
    keys = set(records[0].keys()) if records else set()

    def pick(*candidates: str) -> str:
        for c in candidates:
            if c in keys:
                return c
        return candidates[0]

    return {
        "codigo": pick("Codigo", "Código", "Username"),
        "nombre": pick("Nombres y Apellidos", "Nombre"),
        "email": pick("Email"),
        "username": pick("Username"),
        "rol": pick("Rol"),
        "password": pick("Contraseña", "Contrasena"),
        "estado": pick("Estado"),
        "comision": pick("Comisión", "Comision"),
        "posicion": pick("Posicion", "Posición", "Posicion"),
    }


def _row_to_admin_user(row: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    h = headers or _credencial_headers()
    comision_raw = row.get(h["comision"], "")
    comision_pct = _norm_commission_to_float(comision_raw)
    comision_display = ""
    if comision_raw not in (None, ""):
        comision_display = _cell_str(comision_raw)
    elif comision_pct is not None:
        comision_display = f"{int(comision_pct * 100)}%"

    return {
        "codigo": _cell_str(row.get(h["codigo"]) or row.get("Username")),
        "nombre": _cell_str(row.get(h["nombre"])),
        "email": _cell_str(row.get(h["email"])),
        "username": _cell_str(row.get(h["username"])),
        "rol": _cell_str(row.get(h["rol"]) or "Asesor") or "Asesor",
        "estado": _cell_str(row.get(h["estado"])),
        "comision": comision_display,
        "posicion": _cell_str(row.get(h["posicion"])),
        "volumen": row.get("Volumen") or row.get("VOLUMEN") or "",
        "ventas": row.get("Ventas") or row.get("VENTAS") or "",
        "ventas_cursos": row.get("Ventas Cursos") or "",
        "volumen_cursos": row.get("Volumen Cursos") or "",
        "ventas_certificado": row.get("Ventas Certificado") or "",
        "volumen_certificado": row.get("Volumen Certificado") or "",
        "ventas_serums": row.get("Ventas Serums") or row.get("VENTAS SERUMS") or "",
        "volumen_serums": row.get("Volumen Serums") or row.get("VOLUMEN SERUMS") or "",
    }


def _format_comision_for_sheet(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if "%" in raw:
        return raw
    try:
        num = float(raw.replace("%", ""))
        if num > 1:
            return f"{int(num)}%"
        return f"{int(num * 100)}%"
    except Exception:
        return raw


def update_admin_asesor(email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (email or "").strip()
    if not email:
        return {"success": False, "error": "Email requerido."}

    existing = gs_service.find_record("credenciales", "usuarios", "Email", email)
    if not existing:
        return {"success": False, "error": "Usuario no encontrado."}

    h = _credencial_headers()
    updates: Dict[str, str] = {}

    if payload.get("nombre") is not None:
        updates[h["nombre"]] = str(payload["nombre"]).strip()
    if payload.get("username") is not None:
        updates[h["username"]] = str(payload["username"]).strip()
    if payload.get("codigo") is not None:
        updates[h["codigo"]] = str(payload["codigo"]).strip()
    if payload.get("rol") is not None:
        updates[h["rol"]] = str(payload["rol"]).strip()
    if payload.get("estado") is not None:
        updates[h["estado"]] = str(payload["estado"]).strip()
    if payload.get("posicion") is not None:
        updates[h["posicion"]] = str(payload["posicion"]).strip()
    if payload.get("comision") is not None:
        updates[h["comision"]] = _format_comision_for_sheet(payload["comision"])
    if payload.get("password"):
        raw_password = str(payload["password"]).strip()
        if len(raw_password) < 8:
            return {"success": False, "error": "La contraseña debe tener al menos 8 caracteres."}
        updates[h["password"]] = hash_password(raw_password)

    new_email = (payload.get("email") or "").strip()
    if new_email and new_email.lower() != email.lower():
        dup = gs_service.find_record("credenciales", "usuarios", "Email", new_email)
        if dup:
            return {"success": False, "error": "Ya existe un usuario con ese correo."}
        updates[h["email"]] = new_email

    if not updates:
        return {"success": False, "error": "No hay cambios para guardar."}

    ok = gs_service.update_record_dict_by_key(
        "credenciales", "usuarios", "Email", email, updates
    )
    if not ok:
        return {"success": False, "error": "No se pudo actualizar el usuario en Google Sheets."}

    lookup_email = new_email or email
    updated = get_admin_asesor(lookup_email)
    return {
        "success": True,
        "message": "Usuario actualizado correctamente.",
        "asesor": updated,
    }


def create_admin_asesor(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or "").strip()
    nombre = (payload.get("nombre") or "").strip()
    username = (payload.get("username") or "").strip()
    codigo = (payload.get("codigo") or "").strip()
    password = (payload.get("password") or "").strip()

    if not all([email, nombre, username, codigo, password]):
        return {"success": False, "error": "Email, nombre, usuario, código y contraseña son obligatorios."}

    if len(password) < 8:
        return {"success": False, "error": "La contraseña debe tener al menos 8 caracteres."}

    if gs_service.find_record("credenciales", "usuarios", "Email", email):
        return {"success": False, "error": "Ya existe un usuario con ese correo."}

    h = _credencial_headers()
    row = {
        h["email"]: email,
        h["nombre"]: nombre,
        h["username"]: username,
        h["codigo"]: codigo,
        h["password"]: hash_password(password),
        h["rol"]: (payload.get("rol") or "Asesor").strip(),
        h["estado"]: (payload.get("estado") or "Activo").strip(),
        h["comision"]: _format_comision_for_sheet(payload.get("comision") or "20%"),
        h["posicion"]: (payload.get("posicion") or "").strip(),
    }

    ok = gs_service.append_record_dict("credenciales", "usuarios", row)
    if not ok:
        return {"success": False, "error": "No se pudo crear el usuario en Google Sheets."}

    return {
        "success": True,
        "message": "Usuario creado correctamente.",
        "asesor": get_admin_asesor(email),
    }


def delete_admin_asesor(email: str, admin_email: str = "") -> Dict[str, Any]:
    email = (email or "").strip()
    if not email:
        return {"success": False, "error": "Email requerido."}

    if admin_email and email.lower() == admin_email.strip().lower():
        return {"success": False, "error": "No puedes eliminar tu propia cuenta."}

    existing = gs_service.find_record("credenciales", "usuarios", "Email", email)
    if not existing:
        return {"success": False, "error": "Usuario no encontrado."}

    ok = gs_service.delete_record_by_key("credenciales", "usuarios", "Email", email)
    if not ok:
        return {"success": False, "error": "No se pudo eliminar el usuario en Google Sheets."}

    return {
        "success": True,
        "message": "Usuario eliminado correctamente.",
        "email": email,
    }
