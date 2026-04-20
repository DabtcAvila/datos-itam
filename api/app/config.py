from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    cors_origins: list[str] = ["http://localhost:8787", "https://datos-itam.org"]
    pool_size: int = 5
    max_overflow: int = 10
    testing: bool = False

    model_config = {"env_file": ".env"}


settings = Settings()
