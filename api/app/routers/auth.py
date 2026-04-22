from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user, verify_password
from app.database import get_session
from app.models.users import User
from app.schemas.auth import Token, UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, session: AsyncSession = Depends(get_session)):
    raise HTTPException(
        status_code=403,
        detail=(
            "Registration is currently disabled. Admin users are created via CLI "
            "(see api/scripts/create_admin.py). Contact project owner: "
            "df.avila.diaz@gmail.com"
        ),
    )


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user.username})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
