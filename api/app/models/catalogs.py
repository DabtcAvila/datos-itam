from sqlmodel import Field, SQLModel


class CatSector(SQLModel, table=True):
    __tablename__ = "cat_sectores"
    id: int = Field(primary_key=True)
    clave: str
    nombre: str


class CatPuesto(SQLModel, table=True):
    __tablename__ = "cat_puestos"
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoContratacion(SQLModel, table=True):
    __tablename__ = "cat_tipos_contratacion"
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoPersonal(SQLModel, table=True):
    __tablename__ = "cat_tipos_personal"
    id: int = Field(primary_key=True)
    nombre: str


class CatTipoNomina(SQLModel, table=True):
    __tablename__ = "cat_tipos_nomina"
    id: int = Field(primary_key=True)
    clave: int


class CatUniverso(SQLModel, table=True):
    __tablename__ = "cat_universos"
    id: int = Field(primary_key=True)
    clave: str
    nombre: str


class CatSexo(SQLModel, table=True):
    __tablename__ = "cat_sexos"
    id: int = Field(primary_key=True)
    nombre: str


class CatNivelSalarial(SQLModel, table=True):
    __tablename__ = "cat_niveles_salariales"
    id: int = Field(primary_key=True)
    clave: int
