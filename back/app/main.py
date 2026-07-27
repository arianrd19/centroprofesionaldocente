from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
import secrets

from app.routers import public, admin, auth, dashboard
from app.core.config import settings
from app.core.config import ROOT
from app.core.limiter import limiter

if os.getenv('ENVIRONMENT', 'development') == 'production':
    if settings.SECRET_KEY == 'dev_key_change_this':
        raise ValueError("SECRET_KEY debe estar configurado en producción.")

app = FastAPI(
    title="Centro Profesional Docente",
    description="API unificada: certificados QR y panel de asesores",
    version="2.0.0",
    docs_url="/docs" if os.getenv('ENVIRONMENT', 'development') != 'production' else None,
    redoc_url="/redoc" if os.getenv('ENVIRONMENT', 'development') != 'production' else None,
)

allowed_origins = []
is_production = os.getenv('ENVIRONMENT', 'development') == 'production'

if is_production:
    if settings.BASE_URL:
        allowed_origins.append(settings.BASE_URL)
        if settings.FRONTEND_URL:
            allowed_origins.append(settings.FRONTEND_URL)
        if settings.DASHBOARD_URL:
            allowed_origins.append(settings.DASHBOARD_URL)
        if settings.BASE_URL.startswith('https://'):
            allowed_origins.append(settings.BASE_URL.replace('https://', 'https://www.'))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept", "X-CSRF-Token"],
        expose_headers=["Content-Type"],
        max_age=3600,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept", "X-CSRF-Token"],
        expose_headers=["Content-Type"],
        max_age=3600,
    )

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.method == "POST" and "/certificados/subir" in request.url.path:
        import logging
        logging.getLogger("upload").info("Recibiendo POST %s", request.url.path)
    return await call_next(request)


CSRF_EXEMPT_PATHS = {"/api/auth/login"}
CSRF_PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def verify_csrf(request: Request, call_next):
    # El CSRF solo protege acciones que viajan sobre una sesión autenticada
    # (cookie access_token). Endpoints públicos sin sesión (búsqueda de
    # certificados, etc.) no tienen nada que un atacante pueda secuestrar.
    has_session = bool(request.cookies.get("access_token"))
    if (
        has_session
        and request.method in CSRF_PROTECTED_METHODS
        and request.url.path.startswith("/api/")
        and request.url.path not in CSRF_EXEMPT_PATHS
    ):
        cookie_token = request.cookies.get("csrf_token")
        header_token = request.headers.get("x-csrf-token")
        if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Token CSRF invalido o ausente"},
            )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if os.getenv('ENVIRONMENT', 'development') == 'production':
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        errors.append(f"{field}: {error.get('msg', 'Error')}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "; ".join(errors) if errors else "Error de validación"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    is_production = os.getenv('ENVIRONMENT', 'development') == 'production'
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor" if is_production else str(exc)},
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(public.router, prefix="/api/public", tags=["public"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

from app.routers import compras, clientes
app.include_router(compras.router, prefix="/api/admin", tags=["compras"])
app.include_router(clientes.router, prefix="/api/admin", tags=["clientes"])

uploads_path = ROOT / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
