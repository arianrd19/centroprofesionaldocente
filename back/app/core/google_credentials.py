"""
Carga unificada de la cuenta de servicio de Google.

Una sola cuenta para certificados QR y dashboard. Orden de resolución:
  1. GOOGLE_SERVICE_ACCOUNT_FILE (o GOOGLE_SA_FILE)
  2. GOOGLE_APPLICATION_CREDENTIALS
  3. path/service_account.json en el proyecto
  4. GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT (JSON en env)
  5. GOOGLE_SERVICE_ACCOUNT_B64 (JSON en base64, útil en Render/Heroku)
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Iterable, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials as UserCredentials
from google.oauth2.service_account import Credentials

from app.core.config import ROOT

DEFAULT_SCOPES: List[str] = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

DRIVE_SCOPES: List[str] = ["https://www.googleapis.com/auth/drive.file"]


def _candidate_files() -> Iterable[str]:
    yield os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
    yield os.getenv("GOOGLE_SA_FILE")
    yield os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    yield str(ROOT / "path" / "service_account.json")
    yield str(ROOT / "service_account.json")
    yield "/etc/secrets/GOOGLE_SERVICE_ACCOUNT"
    yield "/etc/secrets/service_account.json"


def resolve_service_account_file() -> Optional[str]:
    """Devuelve la ruta al JSON de la cuenta de servicio, si existe."""
    for candidate in _candidate_files():
        if candidate and os.path.exists(candidate):
            return str(Path(candidate).resolve())
    return None


def _parse_service_account_info(raw: str) -> dict:
    info = json.loads(raw.strip())
    if "private_key" in info and isinstance(info["private_key"], str):
        info["private_key"] = info["private_key"].replace("\\n", "\n")
    return info


def _credentials_from_env_json(scopes: List[str]) -> Optional[Credentials]:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT")
    if not raw or "{" not in raw:
        return None
    return Credentials.from_service_account_info(
        _parse_service_account_info(raw),
        scopes=scopes,
    )


def _credentials_from_env_b64(scopes: List[str]) -> Optional[Credentials]:
    b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if not b64:
        return None
    raw = base64.b64decode(b64).decode("utf-8")
    return Credentials.from_service_account_info(
        _parse_service_account_info(raw),
        scopes=scopes,
    )


def _service_account_with_subject(
    scopes: List[str],
    subject: str,
) -> Optional[Credentials]:
    sa_file = resolve_service_account_file()
    if sa_file:
        return Credentials.from_service_account_file(sa_file, scopes=scopes, subject=subject)

    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT")
    if raw and "{" in raw:
        return Credentials.from_service_account_info(
            _parse_service_account_info(raw),
            scopes=scopes,
            subject=subject,
        )

    b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if b64:
        raw = base64.b64decode(b64).decode("utf-8")
        return Credentials.from_service_account_info(
            _parse_service_account_info(raw),
            scopes=scopes,
            subject=subject,
        )
    return None


def _oauth_drive_credentials(scopes: List[str]) -> Optional[UserCredentials]:
    client_id = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN", "").strip()
    if not (client_id and client_secret and refresh_token):
        return None

    creds = UserCredentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes,
    )
    creds.refresh(Request())
    return creds


def load_service_account_credentials(scopes: Optional[List[str]] = None) -> Credentials:
    """Carga las credenciales de la única cuenta de servicio configurada."""
    use_scopes = scopes or DEFAULT_SCOPES

    sa_file = resolve_service_account_file()
    if sa_file:
        return Credentials.from_service_account_file(sa_file, scopes=use_scopes)

    creds = _credentials_from_env_json(use_scopes)
    if creds:
        return creds

    creds = _credentials_from_env_b64(use_scopes)
    if creds:
        return creds

    raise ValueError(
        "No hay credenciales de Google configuradas. "
        "Define GOOGLE_SERVICE_ACCOUNT_FILE (o GOOGLE_SA_FILE), "
        "GOOGLE_SERVICE_ACCOUNT_JSON, o coloca path/service_account.json."
    )


def load_drive_credentials(scopes: Optional[List[str]] = None):
    """
    Credenciales para subir archivos a Drive.

    Orden:
      1. OAuth (cuenta personal de Google con refresh token)
      2. Cuenta de servicio con impersonación (Google Workspace)
      3. Cuenta de servicio directa (solo funciona en unidades compartidas)
    """
    use_scopes = scopes or DRIVE_SCOPES

    oauth = _oauth_drive_credentials(use_scopes)
    if oauth:
        return oauth

    impersonate = os.getenv("GOOGLE_DRIVE_IMPERSONATE_EMAIL", "").strip()
    if impersonate:
        creds = _service_account_with_subject(use_scopes, impersonate)
        if creds:
            return creds

    return load_service_account_credentials(use_scopes)
