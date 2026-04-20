from slowapi import Limiter

from app.config import settings


def get_real_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _no_limit(_request) -> str:
    return ""


limiter = Limiter(
    key_func=get_real_ip if not settings.testing else _no_limit,
    enabled=not settings.testing,
)
