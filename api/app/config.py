import secrets
import warnings

from pydantic_settings import BaseSettings

_DEFAULT_SECRET = "dev-secret-change-in-production"


class Settings(BaseSettings):
    database_url: str
    cors_origins: list[str] = [
        "http://localhost:8787",
        "http://localhost:3000",
        "https://datos-itam.org",
        "https://www.datos-itam.org",
    ]
    pool_size: int = 5
    max_overflow: int = 10
    testing: bool = False
    secret_key: str = _DEFAULT_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = {"env_file": ".env"}


settings = Settings()

# --- Fail loudly if secret_key is insecure in production ---
if settings.secret_key == _DEFAULT_SECRET and not settings.testing:
    _auto = secrets.token_urlsafe(32)
    warnings.warn(
        "SECRET_KEY is not set — using an ephemeral random key. "
        "Auth tokens will NOT survive restarts. "
        "Set SECRET_KEY in your environment for production.",
        stacklevel=1,
    )
    settings.secret_key = _auto
