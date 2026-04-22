from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import engine
from app.rate_limit import limiter
from app.routers import admin, analytics, auth, catalogos, comparativo, dashboard, enigh, export, ingest, nombramientos, personas, sectores, servidores


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


API_DESCRIPTION = """
API pública del Observatorio de Datos Públicos Mexicanos.

**Datasets expuestos:**
- **Servidores públicos CDMX** (schema `cdmx`): 246K registros de servidores
  públicos de la Ciudad de México.
- **ENIGH 2024 Nueva Serie** (schema `enigh`): Encuesta Nacional de Ingresos
  y Gastos de los Hogares 2024, 91K hogares muestra, expandible a 38.8M
  hogares nacional.
- **Comparativos cross-dataset** (`/comparativo/*`): análisis CDMX↔ENIGH
  cuantificados.

**Rigor metodológico:**
- 13 bounds oficiales INEGI reproducidos al peso (Δ máx 0.078%)
- Factor-weighted cumulative sum para deciles (NO NTILE)
- Byte-exact local ≡ Neon verificado vía MD5 cross-DB
- Tests E2E en cada push validan producción

**Fuente oficial:**
[Comunicado INEGI 112/25](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH_2024NS.pdf)
(julio 2025).

**Proyecto académico:** ITAM Bases de Datos 2026.
"""

app = FastAPI(
    title="datos-itam Observatorio API",
    description=API_DESCRIPTION,
    version="1.0.0",
    contact={
        "name": "Observatorio datos-itam",
        "url": "https://datos-itam.org",
        "email": "df.avila.diaz@gmail.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    terms_of_service="https://datos-itam.org/terms",
    servers=[
        {"url": "https://api.datos-itam.org", "description": "Producción"},
    ],
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*", "Authorization"],
)


WRITE_PREFIXES = ("/api/v1/auth", "/api/v1/personas", "/api/v1/nombramientos", "/api/v1/ingest", "/api/v1/admin")


def _set_public_cache(response, cache_value: str) -> None:
    """Set Cache-Control and ensure Vary: Origin.

    Why Vary: Origin: CORSMiddleware only sets Access-Control-Allow-Origin
    when the request has an Origin header. If a non-browser client (curl
    without -H Origin, healthcheck, prefetcher) hits a cacheable endpoint
    first, the CDN caches the response WITHOUT the CORS header. Subsequent
    browser requests get that cached response and fail CORS. Setting
    Vary: Origin forces the CDN to key cache entries by URL + Origin so
    browser and non-browser responses don't collide.
    """
    response.headers["Cache-Control"] = cache_value
    existing_vary = response.headers.get("Vary", "")
    vary_parts = [v.strip() for v in existing_vary.split(",") if v.strip()]
    if not any(v.lower() == "origin" for v in vary_parts):
        vary_parts.append("Origin")
    response.headers["Vary"] = ", ".join(vary_parts)


class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        # Don't cache write endpoints
        if any(path.startswith(p) for p in WRITE_PREFIXES):
            response.headers["Cache-Control"] = "no-store"
        elif "/catalogos/" in path or path.startswith("/api/v1/sectores"):
            _set_public_cache(response, "public, max-age=3600")
        elif path.startswith("/api/v1/dashboard"):
            _set_public_cache(response, "public, max-age=3600")
        elif path.startswith("/api/v1/analytics"):
            _set_public_cache(response, "public, max-age=900")
        elif path.startswith("/api/v1/enigh"):
            _set_public_cache(response, "public, max-age=3600")
        elif path.startswith("/api/v1/comparativo"):
            _set_public_cache(response, "public, max-age=3600")
        elif "/servidores/" in path:
            _set_public_cache(response, "public, max-age=300")
        return response


app.add_middleware(CacheControlMiddleware)


app.include_router(auth.router)
app.include_router(servidores.router)
app.include_router(sectores.router)
app.include_router(catalogos.router)
app.include_router(export.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(personas.router)
app.include_router(nombramientos.router)
app.include_router(ingest.router)
app.include_router(enigh.router)
app.include_router(comparativo.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


