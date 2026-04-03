"""
JWT Authentication module for Rehab AI backend.
Handles token creation, validation, and user management (in-memory store for dev).
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

load_dotenv()

# ─── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# ─── Models ────────────────────────────────────────────────────────────────────


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── In-memory user store (replace with DB in production) ──────────────────────

_users: dict[str, dict] = {}
_next_id = 1


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── Token helpers ─────────────────────────────────────────────────────────────


def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT token for a user."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRATION_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


# ─── Auth operations ──────────────────────────────────────────────────────────


def register_user(data: UserCreate) -> TokenResponse:
    """Register a new user and return a JWT."""
    global _next_id

    # Check if email already exists
    for u in _users.values():
        if u["email"] == data.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    user_id = str(_next_id)
    _next_id += 1

    _users[user_id] = {
        "id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "password_hash": _hash_password(data.password),
    }

    token = create_access_token(user_id, data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=data.email, full_name=data.full_name),
    )


def login_user(data: UserLogin) -> TokenResponse:
    """Authenticate a user and return a JWT."""
    for u in _users.values():
        if u["email"] == data.email:
            if not _verify_password(data.password, u["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials",
                )
            token = create_access_token(u["id"], u["email"])
            return TokenResponse(
                access_token=token,
                user=UserResponse(
                    id=u["id"], email=u["email"], full_name=u.get("full_name")
                ),
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


# ─── FastAPI dependency ───────────────────────────────────────────────────────


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """FastAPI dependency: extract and validate user from Bearer token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return verify_token(credentials.credentials)


def verify_ws_token(token: str) -> dict:
    """Verify a token from WebSocket query params."""
    return verify_token(token)
