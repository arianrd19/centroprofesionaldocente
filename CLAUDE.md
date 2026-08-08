# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Centro Profesional Docente (CENPROD) — certificate issuance/verification system with QR codes, plus an internal sales-advisor dashboard, for a Peruvian teacher-training institute. Two independent apps in one repo:

- `back/` — FastAPI (Python), deployed to Render.
- `front/` — React 18 + Vite 5 SPA, deployed to shared Apache hosting via static `dist/` + `.htaccess`.

**There is no SQL database.** All persistent data (certificates, clients, purchases, advisor credentials, monthly sales ledgers) lives in **Google Sheets**, read/written through `gspread`. Uploaded files (payment receipts, DNI scans, generated certificate PDFs) go to **Google Drive** or local `back/uploads/`.

## Commands

### Backend (`back/`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload          # dev server (http://localhost:8000)
uvicorn app.main:app --host 0.0.0.0 --port $PORT   # prod, see Procfile
```
No test suite, linter, or formatter is configured for the backend. Python 3.11 (see `runtime.txt`).

### Frontend (`front/`)
```bash
npm install
npm run dev        # Vite dev server on http://localhost:3000, proxies /api and /uploads to localhost:8000
npm run build       # production build to front/dist
npm run preview
```
No test suite or linter is configured for the frontend.

### Running both locally
Start the backend on port 8000 first, then `npm run dev` in `front/` — the Vite dev proxy (`vite.config.js`) forwards `/api` and `/uploads` to `localhost:8000`. Do **not** set `VITE_API_URL` in dev; multipart file uploads only work reliably same-origin through the proxy (see comment in `front/.env.development`).

## Architecture

### Two domains sharing one backend
The FastAPI app serves two largely independent products against the same Google Sheets workbook:

1. **Certificate QR system** (`/panel` on the frontend, `admin`/`operador` roles) — CRUD for certificates, PDF+QR generation, verification by the public.
2. **Advisor sales dashboard** (`/dashboard` on the frontend, `admin`/`operador`/`asesor` roles) — sales, collections (cobranza), commissions, receipt uploads to Drive, a monthly leaderboard.

These two domains have **separate, non-unified Google Sheets clients**:
- `back/app/core/google_sheets.py` (`GoogleSheetsService`, singleton `sheets_service`) — used by certificates/clients/purchases routers.
- `back/app/core/dashboard_sheets.py` (`GoogleSheetService`, singleton `gs_service`, with caching + retry-on-quota) — used by the advisor dashboard.

Both implement their own header-mapping, caching, and row lookup logic against similarly-shaped sheets. When touching sheet I/O, check which client the router already imports (`sheets_service` vs `gs_service`) — they are not interchangeable and don't share cache invalidation.

### Sheets/Drive topology (`back/app/core/config.py`)
- `GOOGLE_SHEET_ID` (one workbook) holds: `certificados`, `CERTIFICADOS QR`, `compras`, `CLIENTES`, `QUERYS CURSOS`, `QUERYS CERTIFICADOS`, and **monthly tabs** whose names are hardcoded per month (`JULIO-2026`, `CERTIFICADOS JULIO-2026`, `SERUMS JULIO-2026` — see `_CURSOS_WS_DEFAULT` etc.). These must be updated (env vars or code) every month or the dashboard silently shows empty data for that period.
- `SHEET_CREDENCIALES_ID` — separate workbook, sheet `CREDENCIALES`/`usuarios`, holds advisor login + role + commission %.
- `GOOGLE_SHEET_MENCIONES_ID` — separate workbook, catalog of "menciones" (course specializations) used when generating certificates.
- Drive folder IDs for comprobantes/certificados/serums uploads.

Google credentials resolution (`back/app/core/google_credentials.py`) tries, in order: a service-account file path (`GOOGLE_SERVICE_ACCOUNT_FILE`/`GOOGLE_SA_FILE`/`GOOGLE_APPLICATION_CREDENTIALS`), inline JSON (`GOOGLE_SERVICE_ACCOUNT_JSON`/`GOOGLE_SERVICE_ACCOUNT`), base64 JSON (`GOOGLE_SERVICE_ACCOUNT_B64`), or OAuth impersonation (`GOOGLE_DRIVE_OAUTH_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`, `GOOGLE_DRIVE_IMPERSONATE_EMAIL`) for Drive access.

### Backend layout
- `app/main.py` — app bootstrap: CORS (env-driven allowlist including `BASE_URL`/`FRONTEND_URL`/`DASHBOARD_URL`), a request-logging middleware for `POST /certificados/subir` uploads, a CSRF-verification middleware (see Auth below), security headers (CSP/HSTS/nosniff), global exception handler that hides internals in production, router mounting, `/uploads` static mount, `/health` + `/api/health`.
- `app/routers/` — `auth`, `public` (unauthenticated certificate lookup/PDF), `admin` (certificate CRUD, PDF merge/replace), `dashboard` (advisor endpoints + admin-asesores CRUD), `compras` (convert pending sheet rows into certificates), `clientes` (CLIENTES sheet CRUD).
- `app/core/` — `config.py` (settings), `security.py` (JWT create/decode, `get_current_user`/`get_admin_user`/`get_operator_or_admin` deps), `dashboard_auth.py` (advisor auth against CREDENCIALES, bcrypt hash/verify with lazy plaintext→hash migration on login), `users.py` (thin wrapper delegating to `dashboard_auth`; `create_user`/`update_user_status` are intentionally disabled — users are managed directly in the CREDENCIALES sheet), `google_sheets.py`, `dashboard_sheets.py`, `google_drive.py`, `google_credentials.py`, `pdf_generator.py` (reportlab, draws onto `back/plantillas/plantilla.png` with hardcoded pixel coordinates), `qr_generator.py` (QR always points to `{BASE_URL}/consulta/{codigo}`), `code_generator.py` (deterministic SHA-256-based certificate codes from `mencion_nro-dni`; `generate_unique_certificate_code` adds a salt-and-retry loop for collisions), `storage.py` (local/PDF file storage under `back/uploads/`), `limiter.py` (slowapi, IP resolution behind Cloudflare/Render proxies), `errors.py` (`raise_safe_500` helper — logs full exception, returns a generic message to the client; use this instead of interpolating `str(e)` into `HTTPException.detail`).
- `app/services/` — `dashboard_service.py` (large: home/leaderboard data, `mi-dashboard` monthly summary, cobranza, admin-asesores CRUD, commission math — commissions are **hardcoded percentages** per product type, not driven by each advisor's `Comisión` field, which is a known inconsistency, not a bug to silently "fix"), `venta_upload.py` (validates + uploads receipt/DNI files to Drive).
- `app/models/schemas.py` — Pydantic models, used mainly by the certificates routers (dashboard routers mostly use inline dicts/Pydantic bodies defined in the router file).

### Auth model
- Login (`POST /api/auth/login`) authenticates against the `CREDENCIALES` sheet. Passwords are bcrypt-hashed; if a stored password is still plaintext (legacy rows), a successful login **lazily rewrites it as a bcrypt hash** in the sheet (`_migrate_plaintext_password` in `dashboard_auth.py`) — no manual reset campaign needed.
- Session is a JWT in an `httpOnly` cookie (`access_token`), **not** in `localStorage`/`Authorization` header — the frontend (`front/src/utils/auth.js`, `api.js`) relies entirely on the cookie plus a matching non-httpOnly `csrf_token` cookie sent back as the `X-CSRF-Token` header on every mutating request. `verify_csrf` middleware in `main.py` enforces this for all `POST/PUT/PATCH/DELETE` under `/api/` except `/api/auth/login`.
- Roles: `admin`, `operador`, `asesor`, resolved from the sheet's `Rol` column via `map_sheet_role`. `get_admin_user`/`get_operator_or_admin` FastAPI dependencies gate routers.
- `GET /api/auth/me` re-validates the cookie and returns the current profile; the frontend uses it to hydrate/verify session state on load instead of trusting `localStorage` alone.

### Frontend layout (`front/src/`)
- `App.jsx` — route tree: public landing (`/`, `/cursos`, `/blog`, `/nosotros`, `/contacto`, `/verificar`, `/certificado/:codigo`, `/consulta/:codigo`, `/pdf/:codigo`), `/login`, `/panel/*` (certificate admin panel, gated by `ProtectedRoute` to `admin` role), `/dashboard/*` (advisor dashboard, gated by `DashboardProtectedRoute`).
- `landing/` — marketing site (Header/Footer/sections/cart), fully separate visual system from the dashboard. The landing's "Aula Virtual" / login entry points now link to `DASHBOARD_URL` (`front/src/landing/paths.js`) rather than an internal `/login` route — the intent is for `/login`, `/panel`, `/dashboard` to eventually live on a `dashboard.<domain>` subdomain while the same SPA build is deployed to both hosts. In local dev this is pointed at `http://localhost:3000` via `VITE_DASHBOARD_URL` in `.env.development`.
- `pages/dashboard/` — advisor pages. `DashboardHome.jsx` (`/dashboard`, "Inicio") is the at-a-glance summary: personal stats, this-month totals/breakdown (fetched from `/dashboard/mi-dashboard`), and the leaderboard. `MiDashboard.jsx` (`/dashboard/mi-panel`, "Últimas ventas") is deliberately scoped to just the three "latest sales" tables (cursos/serums/certificados) with a client-side cliente/DNI filter — these two pages were consolidated from a prior overlapping design; don't reintroduce duplicate summary cards across both.
- `components/` — admin panel components (`CrearCertificado`, `ListaCertificados`, `GestionClientes`, `UnirPDFs`, `ReemplazarPDF`) and shared layout (`AppShell`/`AppSidebar` used by both `/panel` and `/dashboard`).
- `utils/api.js` — shared axios instance; attaches `X-CSRF-Token` on non-GET requests, on `401` calls `handleUnauthorized()` (clears local profile, redirects to `/login?sesion=1`). `utils/auth.js` — `getUser`/`setUser` (non-sensitive profile only, in `localStorage`) and `getCsrfToken()` (reads the cookie). `utils/submitFormData.js` — a separate raw-axios path (not the shared `api` instance) used specifically for large multipart uploads through the Vite dev proxy; keep it in sync with `api.js`'s CSRF header if the mutation-auth scheme changes again.

### Design system notes (dashboard pages)
`front/src/pages/dashboard/*.css` files use plain CSS (no Tailwind, no CSS-in-JS) with page-scoped custom properties (e.g. `--dp-*` defined on `.dash-panel`, `--dash-*` defined on `.dash-home`). **These custom properties only resolve inside their defining ancestor class** — copying markup between pages without also wrapping it in the right ancestor class silently breaks styling (this caused a real invisible-text bug once). The established card convention across the whole dashboard (`AppShell.css`, `DashboardHome.css`, `Menciones.css`) is a white card + `border-left: 4px solid <accent>` + `var(--shadow-card)`; match it rather than introducing a new card language. Global tokens (colors, radii, shadows) live in `front/src/index.css`.

## Known architectural debt (documented, not silently "fixed" in passing)
- Two parallel Google Sheets client implementations (`google_sheets.py` vs `dashboard_sheets.py`) with duplicated header-mapping logic.
- Commission calculation in `dashboard_service.py` uses fixed percentages instead of each advisor's individual `Comisión` field.
- Monthly sheet tab names are hardcoded in `config.py` and must be updated by hand each month.
- Dashboard sales cycles run from the 7th of the named month to the 6th of the next month (inclusive), not calendar months (`CYCLE_START_DAY` / `CYCLE_END_DAY` in `dashboard_service.py`). Filtering uses **FECHA DE LA VENTA** only (never `Marca temporal`).
