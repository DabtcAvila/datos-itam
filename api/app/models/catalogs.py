from sqlmodel import Field, SQLModel

# All catalog tables live in the `cdmx` schema (migration 005).
_CDMX = {"schema": "cdmx"}


class CatSector(SQLModel, table=True):
    __tablename__ = "cat_sectores"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    clave: str
    nombre: str


class CatPuesto(SQLModel, table=True):
    __tablename__ = "cat_puestos"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoContratacion(SQLModel, table=True):
    __tablename__ = "cat_tipos_contratacion"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoPersonal(SQLModel, table=True):
    __tablename__ = "cat_tipos_personal"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoNomina(SQLModel, table=True):
    __tablename__ = "cat_tipos_nomina"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    clave: int


class CatUniverso(SQLModel, table=True):
    __tablename__ = "cat_universos"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    clave: str
    nombre: str


class CatSexo(SQLModel, table=True):
    __tablename__ = "cat_sexos"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    nombre: str


class CatNivelSalarial(SQLModel, table=True):
    __tablename__ = "cat_niveles_salariales"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    clave: int
