import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_session
from app.models.users import User
from app.schemas.auth import Token, UserCreate, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, session: AsyncSession = Depends(get_session)):
    try:
        # Check duplicate username or email
        result = await session.execute(
            select(User).where((User.username == body.username) | (User.email == body.email))
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Username or email already registered")

        user = User(
            username=body.username,
            email=body.email,
            hashed_password=hash_password(body.password),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Register error")
        raise HTTPException(status_code=500, detail=str(e))


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
