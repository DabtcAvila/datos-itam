import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int = Field(primary_key=True)
    username: str = Field(max_length=50, unique=True)
    email: str = Field(max_length=100, unique=True)
    hashed_password: str = Field(max_length=200)
    is_active: bool = Field(default=True)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.utcnow()
    )
