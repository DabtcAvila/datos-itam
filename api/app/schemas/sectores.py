from pydantic import BaseModel


class SectorWithStats(BaseModel):
    id: int
    nombre: str
    total_servidores: int
    sueldo_bruto_avg: float | None
    count_hombres: int
    count_mujeres: int


class TopPuesto(BaseModel):
    puesto: str
    count: int
    sueldo_avg: float | None


class SectorDetailStats(BaseModel):
    id: int
    nombre: str
    total_servidores: int
    sueldo_bruto_avg: float | None
    sueldo_bruto_median: float | None
    sueldo_neto_avg: float | None
    edad_avg: float | None
    count_hombres: int
    count_mujeres: int
    brecha_genero_pct: float | None
    top_puestos: list[TopPuesto]


class SectorComparison(BaseModel):
    sector_a: SectorDetailStats
    sector_b: SectorDetailStats
