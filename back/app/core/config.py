"""
Configuración central de la aplicación.

Libros Google Sheets:
  - GOOGLE_SHEET_ID        → todo certificados, ventas, clientes, compras, registros mensuales
  - SHEET_CREDENCIALES_ID  → login asesores
  - GOOGLE_SHEET_MENCIONES_ID → catálogo de menciones

Credenciales: app/core/google_credentials.py
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent.parent


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _sheet(sheet_id: str, worksheets: dict, nombre: str | None = None) -> dict:
    entry = {"id": sheet_id, "worksheets": worksheets}
    if nombre:
        entry["nombre"] = nombre
    return entry


# ---------------------------------------------------------------------------
# Google Sheets
# ---------------------------------------------------------------------------

# Libro principal: certificados QR, QUERYS, clientes, compras y registros mensuales
_MAIN_SHEET_ID = _env("GOOGLE_SHEET_ID", "15sZo9tyeF-hw0Pgd8YrDgJBNkUPXBF0u6BTEj8-p3Fw")

_CREDENCIALES_SHEET_ID = _env(
    "SHEET_CREDENCIALES_ID",
    "148ihDOBboVOf7vDOFnqaqDSXH1dO3yB_yXiX5454UCY",
)
_CREDENCIALES_WS = _env("GOOGLE_SHEET_CREDENCIALES_WS", "CREDENCIALES")
_MENCIONES_SHEET_ID = _env(
    "GOOGLE_SHEET_MENCIONES_ID",
    "1zaFo7ZJq0yAIjNwcTWJiCr3odCzs6ZYL_ibRE8yrkeM",
)

# Pestañas del libro principal
_WS_CERTIFICADOS_QR = "CERTIFICADOS QR"
_WS_QUERYS_CURSOS = "QUERYS CURSOS"
_WS_QUERYS_CERTIFICADOS = "QUERYS CERTIFICADOS"

# Registros mensuales (subir ventas / subir certificados) — mismo libro, pestañas distintas
_CURSOS_WS_DEFAULT = "JULIO-2026"
_CERT_MENSUAL_WS_DEFAULT = "CERTIFICADOS JULIO-2026"
_SERUMS_WS_DEFAULT = "SERUMS JULIO-2026"
_CURSOS_WS = _env("GOOGLE_SHEET_CURSOS_WS") or _env("GOOGLE_SHEET_REGISTRO_WS", _CURSOS_WS_DEFAULT)
_CERT_MENSUAL_WS = _env("GOOGLE_SHEET_CERT_MENSUAL_WS", _CERT_MENSUAL_WS_DEFAULT)
_SERUMS_WS = _env("GOOGLE_SHEET_SERUMS_WS", _SERUMS_WS_DEFAULT)

# Carpetas Drive
_GOOGLE_DRIVE_COMPROBANTES_FOLDER = _env(
    "GOOGLE_DRIVE_COMPROBANTES_FOLDER_ID",
    "1zE4SaRoOHUv_LfKEVUabcgh76Ad6eadF",
)
_GOOGLE_DRIVE_CERTIFICADOS_FOLDER = _env(
    "GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID",
    "1PgUK7-AvL4Hhyr5uSt2cnbxUYY-p-0ZN",
)
_GOOGLE_DRIVE_SERUMS_FOLDER = _env(
    "GOOGLE_DRIVE_SERUMS_FOLDER_ID",
    "1VRSepuw4WFQV9nyC4U5q8xERkiO8Z8e_",
)


def build_sheets_config() -> dict:
    """
    Claves internas del código → libro y pestañas.

    certificados, ventas, cursos, etc. apuntan al mismo GOOGLE_SHEET_ID;
    solo cambia el nombre de la pestaña (worksheet).
    """
    return {
        # --- Libro principal (GOOGLE_SHEET_ID) ---
        "certificados": _sheet(_MAIN_SHEET_ID, {
            "certificados": "certificados",
            "certificados_qr": _WS_CERTIFICADOS_QR,
        }),
        "compras": _sheet(_MAIN_SHEET_ID, {"compras": "compras"}),
        "clientes": _sheet(_MAIN_SHEET_ID, {"clientes": "CLIENTES"}),
        "ventas": _sheet(_MAIN_SHEET_ID, {
            "cursos": _WS_QUERYS_CURSOS,
            "certificados": _WS_QUERYS_CERTIFICADOS,
        }),
        "cursos": _sheet(_MAIN_SHEET_ID, {"registro": _CURSOS_WS}),
        "certificados_mensual": _sheet(_MAIN_SHEET_ID, {"registro": _CERT_MENSUAL_WS}),
        "serums_mensual": _sheet(_MAIN_SHEET_ID, {"registro": _SERUMS_WS}),
        # --- Libros separados ---
        "credenciales": _sheet(
            _CREDENCIALES_SHEET_ID,
            {"usuarios": _CREDENCIALES_WS},
            nombre="DATOS DE ASESOR - CENTRO PROFESIONAL DOCENTE",
        ),
        "menciones": _sheet(_MENCIONES_SHEET_ID, {"registro": "MENCIONES"}),
    }


class Config:
    SECRET_KEY = _env("SECRET_KEY", "dev_key_change_this")
    BASE_URL = _env("BASE_URL", "https://centroprofesionaldocente.com")
    FRONTEND_URL = _env("FRONTEND_URL", "http://localhost:3000")
    DASHBOARD_URL = _env("DASHBOARD_URL", "https://dashboard.centroprofesionaldocente.com")
    # Dominio compartido para que la cookie csrf_token (no-httpOnly) sea legible
    # por JS en subdominios del front (ej. dashboard.centroprofesionaldocente.com)
    # cuando el backend vive en un subdominio propio (ej. api.centroprofesionaldocente.com).
    # Vacío en dev (cookie host-only para localhost).
    COOKIE_DOMAIN = _env("COOKIE_DOMAIN", "")
    ALGORITHM = _env("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = _env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 30)

    ADMIN_EMAIL = _env("ADMIN_EMAIL", "admin@example.com")
    ADMIN_PASSWORD = _env("ADMIN_PASSWORD", "admin123")

    RATE_LIMIT_PER_MINUTE = _env_int("RATE_LIMIT_PER_MINUTE", 60)
    LOGIN_RATE_LIMIT = _env("LOGIN_RATE_LIMIT", "10/minute")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = timedelta(seconds=_env_int("SESSION_SECONDS", 3600))

    STORAGE_PATH = _env("STORAGE_PATH", "uploads/certificados")
    BASE_STORAGE_URL = _env("BASE_STORAGE_URL", f"{BASE_URL}/uploads/certificados")

    DNIRUC_API_URL = _env("DNIRUC_API_URL", "https://dniruc.apisperu.com/api/v1")
    DNIRUC_API_TOKEN = _env("DNIRUC_API_TOKEN", "")

    GOOGLE_SHEET_ID = _MAIN_SHEET_ID
    GOOGLE_DRIVE_COMPROBANTES_FOLDER_ID = _GOOGLE_DRIVE_COMPROBANTES_FOLDER
    GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID = _GOOGLE_DRIVE_CERTIFICADOS_FOLDER
    GOOGLE_DRIVE_SERUMS_FOLDER_ID = _GOOGLE_DRIVE_SERUMS_FOLDER
    SHEETS = build_sheets_config()


settings = Config()
