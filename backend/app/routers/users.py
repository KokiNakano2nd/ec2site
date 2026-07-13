import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import auth, config, email_utils, models, rate_limit, schemas
from ..database import get_db

router = APIRouter()

PASSWORD_RESET_TOKEN_EXPIRY = timedelta(hours=24)
EMAIL_VERIFICATION_TOKEN_EXPIRY = timedelta(days=7)

REGISTER_RATE_LIMIT = (5, 60 * 60)  # 5 requests / hour per IP (NFR-022)
LOGIN_RATE_LIMIT = (10, 15 * 60)  # 10 requests / 15 minutes per IP (NFR-022)
RATE_LIMIT_MESSAGE = "リクエストが多すぎます。しばらくしてから再度お試しください"


@router.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    max_requests, window_seconds = REGISTER_RATE_LIMIT
    if not rate_limit.check_rate_limit(f"register:{request.client.host}", max_requests, window_seconds):
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)

    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    user = models.User(
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
        email_verification_token=secrets.token_urlsafe(32),
        email_verification_token_expires_at=datetime.utcnow() + EMAIL_VERIFICATION_TOKEN_EXPIRY,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_link = f"{config.FRONTEND_URL}/?verify_token={user.email_verification_token}"
    email_utils.send_verification_email(user.email, verify_link)

    return user


@router.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    max_requests, window_seconds = LOGIN_RATE_LIMIT
    if not rate_limit.check_rate_limit(f"login:{request.client.host}", max_requests, window_seconds):
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)

    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if user is None or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return schemas.Token(access_token=access_token)


@router.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.delete("/users/me", status_code=204)
def delete_account(
    body: schemas.AccountDeleteRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="パスワードが正しくありません")

    email_utils.send_account_deletion_email(current_user.email)

    db.query(models.Address).filter(models.Address.user_id == current_user.id).delete()
    db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).delete()

    current_user.email = f"deleted-user-{current_user.id}@deleted.invalid"
    current_user.hashed_password = auth.hash_password(os.urandom(32).hex())
    current_user.is_active = False
    current_user.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/auth/password-reset/request", status_code=200)
def request_password_reset(body: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email, models.User.is_active.is_(True)).first()
    if user is not None:
        user.password_reset_token = secrets.token_urlsafe(32)
        user.password_reset_token_expires_at = datetime.utcnow() + PASSWORD_RESET_TOKEN_EXPIRY
        db.commit()

        reset_link = f"{config.FRONTEND_URL}/reset-password?token={user.password_reset_token}"
        email_utils.send_password_reset_email(user.email, reset_link)

    return {}


@router.post("/auth/password-reset/confirm", status_code=200)
def confirm_password_reset(body: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.password_reset_token == body.token).first()
    if (
        user is None
        or user.password_reset_token_expires_at is None
        or user.password_reset_token_expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="リンクが無効です。再度お手続きください")

    user.hashed_password = auth.hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    db.commit()

    return {}


@router.post("/auth/verify-email/resend", status_code=200)
def resend_verification_email(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    current_user.email_verification_token = secrets.token_urlsafe(32)
    current_user.email_verification_token_expires_at = datetime.utcnow() + EMAIL_VERIFICATION_TOKEN_EXPIRY
    db.commit()

    verify_link = f"{config.FRONTEND_URL}/?verify_token={current_user.email_verification_token}"
    email_utils.send_verification_email(current_user.email, verify_link)

    return {}


@router.post("/auth/verify-email/confirm", status_code=200)
def confirm_email_verification(body: schemas.EmailVerificationConfirm, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email_verification_token == body.token).first()
    if (
        user is None
        or user.email_verification_token_expires_at is None
        or user.email_verification_token_expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="リンクが無効です。再度お手続きください")

    user.is_verified = True
    user.email_verification_token = None
    user.email_verification_token_expires_at = None
    db.commit()

    return {}
