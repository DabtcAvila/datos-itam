from pydantic import BaseModel


class CatalogItemWithCount(BaseModel):
    id: int
    nombre: str
    count: int


class PuestoWithCount(BaseModel):
    id: int
    nombre: str
    count: int


# --- Request schemas for CRUD ---

class CatalogCreateNombre(BaseModel):
    nombre: str


class CatalogCreateClave(BaseModel):
    clave: int


class CatalogCreateClaveNombre(BaseModel):
    clave: str
    nombre: str


class CatalogUpdateNombre(BaseModel):
    nombre: str | None = None


class CatalogUpdateClave(BaseModel):
    clave: int | None = None


class CatalogUpdateClaveNombre(BaseModel):
    clave: str | None = None
    nombre: str | None = None


# --- Generic response ---

class CatalogResponse(BaseModel):
    id: int

    model_config = {"from_attributes": True}
