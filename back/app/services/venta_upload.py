"""Guardado de comprobantes y documentos en Google Drive."""
import logging
from pathlib import Path

from app.core.config import settings
from app.core.google_drive import upload_file_to_folder

_log = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _validate_file(content: bytes, filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Formato no permitido. Usa imagen (JPG, PNG, WEBP) o PDF.")
    if len(content) > MAX_BYTES:
        raise ValueError("El archivo supera el tamaño máximo de 8 MB.")
    return ext


def _upload_drive(content: bytes, filename: str, folder_id: str, label: str) -> str:
    _validate_file(content, filename)
    if not folder_id:
        raise ValueError(f"Carpeta de {label} no configurada en Google Drive.")
    try:
        return upload_file_to_folder(content, filename, folder_id)
    except ValueError:
        raise
    except Exception as exc:
        _log.error("Error subiendo %s a Drive: %s", label, exc, exc_info=True)
        raise ValueError(f"No se pudo subir {label} a Google Drive.") from exc


def save_comprobante(content: bytes, filename: str) -> str:
    """Comprobante de pago — formulario subir ventas."""
    return _upload_drive(
        content,
        filename,
        settings.GOOGLE_DRIVE_COMPROBANTES_FOLDER_ID,
        "el comprobante",
    )


def save_certificado_comprobante(content: bytes, filename: str) -> str:
    """Comprobante de pago — formulario subir certificados."""
    return _upload_drive(
        content,
        filename,
        settings.GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID,
        "el comprobante",
    )


def save_dni_cliente(content: bytes, filename: str) -> str:
    """DNI del cliente — formulario subir certificados."""
    return _upload_drive(
        content,
        filename,
        settings.GOOGLE_DRIVE_CERTIFICADOS_FOLDER_ID,
        "el DNI del cliente",
    )


def save_serums_comprobante(content: bytes, filename: str) -> str:
    """Comprobante de pago — formulario subir ventas SERUMS."""
    return _upload_drive(
        content,
        filename,
        settings.GOOGLE_DRIVE_SERUMS_FOLDER_ID,
        "el comprobante SERUMS",
    )
