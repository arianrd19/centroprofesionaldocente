"""Autenticación y usuarios desde Google Sheets (hoja CREDENCIALES)."""
import logging
from typing import Any, Dict, List, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.dashboard_sheets import gs_service

CREDENCIALES_BOOK = "credenciales"
CREDENCIALES_WS = "usuarios"

_log = logging.getLogger(__name__)
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _looks_hashed(value: str) -> bool:
    """True si el valor ya es un hash bcrypt (formato $2a$/$2b$/$2y$...)."""
    return bool(value) and value.startswith(("$2a$", "$2b$", "$2y$"))


def hash_password(raw: str) -> str:
    return _pwd_context.hash(raw)


def verify_password(raw: str, stored: str) -> bool:
    """Verifica contraseña contra hash bcrypt, o texto plano (legado)."""
    if _looks_hashed(stored):
        try:
            return _pwd_context.verify(raw, stored)
        except Exception:
            return False
    normalized_stored = _norm_pwd(stored)
    return raw == normalized_stored or raw.lstrip("0") == normalized_stored.lstrip("0")


def _migrate_plaintext_password(identifier_column: str, identifier_value: str, raw_password: str) -> None:
    """Reescribe la contraseña en texto plano como hash bcrypt (migración perezosa)."""
    try:
        headers = gs_service.get_all_records(CREDENCIALES_BOOK, CREDENCIALES_WS)
        password_column = "Contraseña" if headers and "Contraseña" in headers[0] else "Contrasena"
        gs_service.update_record_dict_by_key(
            CREDENCIALES_BOOK,
            CREDENCIALES_WS,
            identifier_column,
            identifier_value,
            {password_column: hash_password(raw_password)},
        )
    except Exception as exc:
        _log.warning("No se pudo migrar contraseña a hash para %s: %s", identifier_value, exc)


def _norm_pwd(x) -> str:
    if x is None:
        return ""
    try:
        if isinstance(x, float):
            if x.is_integer():
                return str(int(x))
            return str(x).strip()
        if isinstance(x, int):
            return str(x)
    except Exception:
        pass
    return str(x).strip()


def _norm_commission_to_float(pct_raw):
    try:
        s = str(pct_raw).strip().replace("%", "")
        if s == "":
            return None
        val = float(s)
        return val / 100.0 if val > 1 else val
    except Exception:
        return None


def safe_float(v, default=0.0) -> float:
    try:
        return float(str(v).replace("S/", "").replace(",", "").strip())
    except Exception:
        return default


def safe_int(v, default=0) -> int:
    try:
        s = str(v).strip()
        if s == "":
            return default
        return int(float(s))
    except Exception:
        return default


def map_sheet_role(rol: str) -> str:
    """Mapea Rol del sheet (Admin, Asesor) al rol interno de la app."""
    r = (rol or "asesor").strip().lower()
    if r == "admin":
        return "admin"
    if r in ("asesor", "asesora"):
        return "asesor"
    if r in ("operador", "operator"):
        return "operador"
    return "asesor"


def _user_codigo(user: Dict[str, Any]) -> str:
    raw = user.get("Codigo") or user.get("Código") or user.get("Username") or ""
    return str(raw).strip() if raw is not None else ""


def find_user_in_sheets(identifier: str) -> Optional[Dict[str, Any]]:
    """Busca usuario por Email o Username (insensible a mayúsculas). Una sola lectura de hoja."""
    identifier = (identifier or "").strip()
    if not identifier:
        return None

    try:
        records = gs_service.get_all_records(
            book_name=CREDENCIALES_BOOK,
            worksheet_name=CREDENCIALES_WS,
        )
    except Exception:
        _log.exception("No se pudo leer la hoja CREDENCIALES")
        return None

    id_lower = identifier.lower()
    for column in ("Email", "Username"):
        for record in records:
            value = record.get(column)
            if value is None:
                continue
            if str(value).strip().lower() == id_lower:
                return record
    return None


def build_session_user(user: Dict[str, Any]) -> Dict[str, Any]:
    comision_float = _norm_commission_to_float(user.get("Comisión")) or 0.20
    codigo = _user_codigo(user)
    raw_posicion = user.get("Posicion") or user.get("Posición")
    posicion = (
        str(raw_posicion).strip().title()
        if raw_posicion not in (None, "")
        else ""
    )
    sheet_rol = (user.get("Rol") or "Asesor").strip()
    jwt_role = map_sheet_role(sheet_rol)

    return {
        "email": (user.get("Email") or "").strip(),
        "username": (user.get("Username") or "").strip(),
        "nombre": (user.get("Nombres y Apellidos") or "").strip(),
        "rol": sheet_rol,
        "role": jwt_role,
        "comision": comision_float,
        "codigo": codigo,
        "posicion": posicion,
        "estado": (user.get("Estado") or "").strip(),
        "volumen": safe_float(user.get("VOLUMEN"), default=0.0),
        "ventas": safe_int(user.get("VENTAS"), default=0),
        "volumen_cursos": safe_float(user.get("Volumen Cursos"), default=0.0),
        "ventas_cursos": safe_int(user.get("Ventas Cursos"), default=0),
        "volumen_certificado": safe_float(user.get("Volumen Certificado"), default=0.0),
        "ventas_certificado": safe_int(user.get("Ventas Certificado"), default=0),
        "volumen_serums": safe_float(
            user.get("Volumen Serums") or user.get("VOLUMEN SERUMS") or user.get("Volumen Serum"),
            default=0.0,
        ),
        "ventas_serums": safe_int(
            user.get("Ventas Serums") or user.get("VENTAS SERUMS") or user.get("Ventas Serum"),
            default=0,
        ),
    }


def list_users_from_sheets() -> List[Dict[str, Any]]:
    """Lista todos los usuarios activos/inactivos desde CREDENCIALES."""
    try:
        records = gs_service.get_all_records(
            book_name=CREDENCIALES_BOOK,
            worksheet_name=CREDENCIALES_WS,
        )
        users = []
        for row in records:
            email = (row.get("Email") or "").strip()
            if not email:
                continue
            session = build_session_user(row)
            users.append(
                {
                    "email": session["email"],
                    "username": session["username"],
                    "nombre": session["nombre"],
                    "role": session["role"],
                    "rol": session["rol"],
                    "codigo": session["codigo"],
                    "active": session["estado"].lower() == "activo",
                    "comision": session["comision"],
                }
            )
        return users
    except Exception:
        return []


def authenticate_from_sheets(identifier: str, password: str) -> Optional[Dict[str, Any]]:
    identifier = (identifier or "").strip()
    password = (password or "").strip()
    if not identifier or not password:
        return None

    try:
        user = find_user_in_sheets(identifier)
        if not user:
            return None

        stored_raw = user.get("Contraseña")
        stored = _norm_pwd(stored_raw)
        if not verify_password(password, stored):
            return None

        if (user.get("Estado") or "").strip().lower() != "activo":
            return None

        if not _looks_hashed(stored):
            email = (user.get("Email") or "").strip()
            if email:
                _migrate_plaintext_password("Email", email, password)

        session_user = build_session_user(user)
        return {
            "email": session_user["email"],
            "role": session_user["role"],
            "rol": session_user["rol"],
            "active": True,
            "nombre": session_user.get("nombre"),
            "codigo": session_user.get("codigo"),
            "username": session_user.get("username"),
            "comision": session_user.get("comision"),
        }
    except Exception:
        _log.exception("Fallo inesperado autenticando %s", identifier)
        return None


def decode_access_token_silent(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def load_session_user_from_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    try:
        user = find_user_in_sheets(email)
        if not user:
            return None
        if (user.get("Estado") or "").strip().lower() != "activo":
            return None
        return build_session_user(user)
    except Exception:
        return None


def get_login_redirect_url() -> str:
    base = settings.DASHBOARD_URL.rstrip("/")
    return f"{base}/login"
