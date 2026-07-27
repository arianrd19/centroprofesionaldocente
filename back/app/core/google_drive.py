"""Subida de archivos a Google Drive (comprobantes de venta)."""
from __future__ import annotations

import io
import logging
import re
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

from app.core.google_credentials import load_drive_credentials, resolve_service_account_file

_log = logging.getLogger(__name__)

_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}

_DRIVE_QUOTA_MSG = (
    "Con Gmail personal la cuenta de servicio no puede subir archivos a Drive. "
    "Configura OAuth en .env (GOOGLE_DRIVE_OAUTH_*) ejecutando: "
    "python scripts/setup_drive_oauth.py"
)


def _drive_service():
    creds = load_drive_credentials()
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _safe_filename(filename: str) -> str:
    name = Path(filename or "comprobante").name
    stem = re.sub(r"[^\w.\- ]+", "_", Path(name).stem)[:80].strip() or "comprobante"
    ext = Path(name).suffix.lower()
    return f"{stem}{ext}" if ext else stem


def _raise_drive_upload_error(exc: Exception) -> None:
    if isinstance(exc, HttpError):
        details = str(exc)
        if "storageQuotaExceeded" in details or "Service Accounts do not have storage quota" in details:
            sa_email = ""
            sa_file = resolve_service_account_file()
            if sa_file:
                import json
                try:
                    sa_email = json.loads(Path(sa_file).read_text(encoding="utf-8")).get("client_email", "")
                except Exception:
                    pass
            hint = _DRIVE_QUOTA_MSG
            if sa_email:
                hint += f" Cuenta de servicio: {sa_email}."
            raise ValueError(hint) from exc
    raise ValueError(f"No se pudo subir el archivo a Google Drive: {exc}") from exc


def upload_file_to_folder(content: bytes, filename: str, folder_id: str) -> str:
    """
    Sube un archivo a una carpeta de Drive y devuelve el enlace open?id=...
    """
    if not folder_id:
        raise ValueError("No está configurada la carpeta de Google Drive.")

    ext = Path(filename or "").suffix.lower()
    mime = _MIME.get(ext, "application/octet-stream")
    final_name = _safe_filename(filename)

    service = _drive_service()
    metadata = {"name": final_name, "parents": [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime, resumable=True)

    try:
        created = service.files().create(
            body=metadata,
            media_body=media,
            fields="id",
            supportsAllDrives=True,
        ).execute()
    except Exception as exc:
        _raise_drive_upload_error(exc)

    file_id = created.get("id")
    if not file_id:
        raise ValueError("Google Drive no devolvió el ID del archivo.")

    try:
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            supportsAllDrives=True,
        ).execute()
    except Exception as exc:
        _log.warning("No se pudo publicar el archivo %s: %s", file_id, exc)

    return f"https://drive.google.com/open?id={file_id}"


_DRIVE_ID_RE = re.compile(r"[?&]id=([^&]+)")


def extract_file_id(drive_url: str) -> str | None:
    """Extrae el file id de una URL `drive.google.com/open?id=...`."""
    if not drive_url:
        return None
    match = _DRIVE_ID_RE.search(drive_url)
    return match.group(1) if match else None


def download_file_bytes(file_id: str) -> bytes:
    """Descarga el contenido binario de un archivo de Drive vAa la cuenta de servicio."""
    service = _drive_service()
    try:
        return service.files().get_media(fileId=file_id, supportsAllDrives=True).execute()
    except Exception as exc:
        raise ValueError(f"No se pudo descargar el archivo de Google Drive: {exc}") from exc
