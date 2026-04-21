from pydantic import BaseModel


class PuestoRanking(BaseModel):
    puesto_id: int
    nombre: str
    avg_sueldo: float
    count: int
    rank: int
    percent_rank: float
    gap_vs_next: float | None


class SectorRanking(BaseModel):
    sector_id: int
    nombre: str
    avg_sueldo: float
    count: int
    rank: int
    percent_rank: float
    avg_vs_global_pct: float


class BrechaEdadRow(BaseModel):
    bucket_edad: str
    avg_male: float | None
    avg_female: float | None
    count_male: int
    count_female: int
    gap_pct: float | None
    running_avg_global: float
