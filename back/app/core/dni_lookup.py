"""Consulta de DNI en RENIEC vía dniruc.apisperu.com (fallback cuando el
cliente no está registrado en la hoja CLIENTES)."""
import logging

import httpx

from app.core.config import settings

_log = logging.getLogger(__name__)


async def consultar_dni_externo(numero: str) -> dict | None:
    """Devuelve {dni, nombres, apellidoPaterno, apellidoMaterno} o None si no se encontró."""
    if not settings.DNIRUC_API_TOKEN:
        _log.warning("DNIRUC_API_TOKEN no configurado; se omite la consulta externa de DNI.")
        return None

    url = f"{settings.DNIRUC_API_URL}/dni/{numero}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params={"token": settings.DNIRUC_API_TOKEN})
    except httpx.HTTPError:
        _log.exception("Error de red consultando dniruc.apisperu.com")
        return None

    if resp.status_code != 200:
        return None

    data = resp.json()
    if not data or not data.get("dni"):
        return None
    return data
