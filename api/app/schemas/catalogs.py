from pydantic import BaseModel


class CatalogItemWithCount(BaseModel):
    id: int
    nombre: str
    count: int


class PuestoWithCount(BaseModel):
    id: int
    nombre: str
    count: int
