# Its Security Guard.
# This file contains the FastAPI Dependency that intercepts incoming requests, reads the Authorization: Bearer <token> header, decodes the JWT, and loads the logged-in user from PostgreSQL.
from collections.abc import AsyncGenerator
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

# 1. OAuth2 scheme: Tells FastAPI that tokens arrive in the Authorization header
# tokenUrl points to our login endpoint so Swagger UI's "Authorize" lock button works!
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# 2. Dependency: Get Current Logged-in User
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Decodes the JWT token from the request header, verifies its digital signature,
    and loads the authenticated User from PostgreSQL.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify the JWT signature using our SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Query PostgreSQL for this user
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


# 3. Role-Based Access Control Guard (RBAC)
def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to protect sensitive endpoints (e.g. Admin-only operations).
    """
    async def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker
