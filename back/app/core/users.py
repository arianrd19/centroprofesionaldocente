"""
Usuarios: base de datos en Google Sheets (hoja CREDENCIALES / usuarios).
"""
from typing import Dict, List, Optional

from app.core.dashboard_auth import (
    authenticate_from_sheets,
    find_user_in_sheets,
    build_session_user,
    list_users_from_sheets,
)


def get_user(email: str) -> Optional[Dict]:
    record = find_user_in_sheets(email)
    if not record:
        return None
    session = build_session_user(record)
    return {
        "email": session["email"],
        "role": session["role"],
        "rol": session["rol"],
        "active": session["estado"].lower() == "activo",
        "nombre": session.get("nombre"),
        "codigo": session.get("codigo"),
        "username": session.get("username"),
    }


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    return authenticate_from_sheets(email, password)


def list_all_users() -> List[Dict]:
    return list_users_from_sheets()


def create_user(email: str, password: str, role: str) -> Dict:
    raise ValueError(
        "Los usuarios se gestionan en Google Sheets (CREDENCIALES). "
        "Agrega o edita filas en la hoja de usuarios."
    )

