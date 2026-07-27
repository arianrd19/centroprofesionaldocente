"""Helper para no filtrar detalles internos de excepciones al cliente."""
import logging

from fastapi import HTTPException


def raise_safe_500(logger: logging.Logger, public_message: str, exc: Exception) -> None:
    """Loggea la excepción completa y lanza un HTTPException 500 con mensaje genérico."""
    logger.exception(public_message)
    raise HTTPException(status_code=500, detail=public_message) from exc
