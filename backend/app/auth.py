from datetime import datetime, timedelta

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import config, models
from .database import get_db

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

PASSWORD_HASHER = PasswordHasher()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith("$argon2"):
        try:
            return PASSWORD_HASHER.verify(hashed_password, plain_password)
        except (InvalidHashError, VerificationError):
            return False

    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except ValueError:
            return False

    return False


def password_needs_rehash(hashed_password: str) -> bool:
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        return True

    if hashed_password.startswith("$argon2"):
        try:
            return PASSWORD_HASHER.check_needs_rehash(hashed_password)
        except InvalidHashError:
            return False

    return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError as e:
        raise credentials_exception from e

    user = db.get(models.User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return current_user
