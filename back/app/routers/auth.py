import logging
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.models.schemas import Token, UserCreate, UserResponse
from app.core.security import create_access_token, get_current_user
from app.core.users import authenticate_user, create_user
from app.core.dashboard_auth import load_session_user_from_email
from app.core.config import settings
from app.core.security import get_admin_user
from app.core.limiter import limiter

_log = logging.getLogger(__name__)

router = APIRouter()


def _set_session_cookies(response: Response, access_token: str, csrf_token: str, max_age: int) -> None:
    is_production = os.getenv('ENVIRONMENT', 'development') == 'production'
    cookie_samesite = "none" if is_production else "lax"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite=cookie_samesite,
        max_age=max_age,
        path="/",
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=is_production,
        samesite=cookie_samesite,
        max_age=max_age,
        path="/",
    )


@router.post("/login", response_model=Token)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """Endpoint de login"""
    _log.warning("LOGIN intento username=%r origin=%r", form_data.username, request.headers.get("origin"))
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    csrf_token = secrets.token_urlsafe(32)

    _set_session_cookies(response, access_token, csrf_token, int(access_token_expires.total_seconds()))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "rol": user.get("rol"),
        "email": user["email"],
        "nombre": user.get("nombre"),
        "codigo": user.get("codigo"),
        "username": user.get("username"),
    }


@router.post("/logout")
async def logout(response: Response):
    is_production = os.getenv('ENVIRONMENT', 'development') == 'production'
    cookie_samesite = "none" if is_production else "lax"
    for cookie_name in ("access_token", "csrf_token"):
        response.delete_cookie(
            key=cookie_name,
            path="/",
            secure=is_production,
            samesite=cookie_samesite,
        )
    return {"message": "Sesion cerrada"}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Devuelve el perfil de la sesión activa (valida la cookie httpOnly)."""
    session_user = load_session_user_from_email(current_user["email"])
    if not session_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesion invalida")
    return {
        "role": session_user["role"],
        "rol": session_user.get("rol"),
        "email": session_user["email"],
        "nombre": session_user.get("nombre"),
        "codigo": session_user.get("codigo"),
        "username": session_user.get("username"),
    }


@router.post("/users", response_model=UserResponse, dependencies=[Depends(get_admin_user)])
async def create_new_user(user_data: UserCreate):
    """Los usuarios se crean en Google Sheets CREDENCIALES."""
    try:
        create_user(user_data.email, user_data.password, user_data.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    raise HTTPException(status_code=400, detail="Use Google Sheets CREDENCIALES.")
