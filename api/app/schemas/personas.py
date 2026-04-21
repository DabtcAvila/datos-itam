from pydantic import BaseModel


class PersonaCreate(BaseModel):
    nombre: str
    apellido_1: str
    apellido_2: str | None = None
    sexo_id: int | None = None
    edad: int | None = None


class PersonaUpdate(BaseModel):
    nombre: str | None = None
    apellido_1: str | None = None
    apellido_2: str | None = None
    sexo_id: int | None = None
    edad: int | None = None


class PersonaResponse(BaseModel):
    id: int
    nombre: str
    apellido_1: str
    apellido_2: str | None = None
    sexo_id: int | None = None
    edad: int | None = None
