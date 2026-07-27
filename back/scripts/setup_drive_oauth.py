"""
Genera GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN para subir comprobantes con Gmail personal.

Uso (desde la carpeta back/):
  pip install google-auth-oauthlib
  python scripts/setup_drive_oauth.py

Requisitos previos en Google Cloud Console (proyecto ceprod):
  1. APIs y servicios → Biblioteca → habilitar "Google Drive API"
  2. APIs y servicios → Pantalla de consentimiento OAuth → tipo Externa → agregar tu Gmail como usuario de prueba
  3. APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth
     → Tipo: Aplicación de escritorio → descargar o copiar Client ID y Secret
  4. Pegar en .env:
       GOOGLE_DRIVE_OAUTH_CLIENT_ID=...
       GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=...
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def _prompt(label: str, env_key: str) -> str:
    value = (os.getenv(env_key) or "").strip()
    if value:
        return value
    return input(f"{label}: ").strip()


def main() -> None:
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Instala la dependencia: pip install google-auth-oauthlib")
        sys.exit(1)

    client_id = _prompt("Client ID OAuth", "GOOGLE_DRIVE_OAUTH_CLIENT_ID")
    client_secret = _prompt("Client secret OAuth", "GOOGLE_DRIVE_OAUTH_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("Faltan Client ID y Client secret.")
        sys.exit(1)

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }

    print("\nSe abrirá el navegador. Inicia sesión con la cuenta Gmail que posee la carpeta de comprobantes.\n")

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

    if not creds.refresh_token:
        print(
            "No se obtuvo refresh_token. Revoca el acceso en "
            "https://myaccount.google.com/permissions y vuelve a ejecutar el script."
        )
        sys.exit(1)

    print("\n--- Copia estas líneas en back/.env y reinicia el servidor ---\n")
    print(f"GOOGLE_DRIVE_OAUTH_CLIENT_ID={client_id}")
    print(f"GOOGLE_DRIVE_OAUTH_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN={creds.refresh_token}")
    print()


if __name__ == "__main__":
    main()
