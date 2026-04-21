from pydantic import BaseModel


class IngestResult(BaseModel):
    inserted: int
    errors: int
    error_details: list[str]
    duration_seconds: float
