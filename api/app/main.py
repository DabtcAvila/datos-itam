from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import engine
from app.rate_limit import limiter
from app.routers import auth, catalogos, dashboard, export, ingest, nombramientos, personas, sectores, servidores


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="datos-itam API",
    description="API publica de remuneraciones de servidores publicos de CDMX",
    version="1.0.0",
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


WRITE_PREFIXES = ("/api/v1/auth", "/api/v1/personas", "/api/v1/nombramientos", "/api/v1/ingest")


class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        # Don't cache write endpoints
        if any(path.startswith(p) for p in WRITE_PREFIXES):
            response.headers["Cache-Control"] = "no-store"
        elif "/catalogos/" in path or path.startswith("/api/v1/sectores"):
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif path.startswith("/api/v1/dashboard"):
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif "/servidores/" in path:
            response.headers["Cache-Control"] = "public, max-age=300"
        return response


app.add_middleware(CacheControlMiddleware)


app.include_router(auth.router)
app.include_router(servidores.router)
app.include_router(sectores.router)
app.include_router(catalogos.router)
app.include_router(export.router)
app.include_router(dashboard.router)
app.include_router(personas.router)
app.include_router(nombramientos.router)
app.include_router(ingest.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug/bcrypt")
async def debug_bcrypt():
    try:
        import bcrypt
        h = bcrypt.hashpw(b"test", bcrypt.gensalt())
        ok = bcrypt.checkpw(b"test", h)
        return {"bcrypt": "ok", "version": getattr(bcrypt, "__version__", "unknown"), "verify": ok}
    except Exception as e:
        return {"bcrypt": "error", "detail": str(e)}
