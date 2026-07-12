import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    user = models.User(
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
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
    from .. import main

    if not auth.verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="パスワードが正しくありません")

    main.send_account_deletion_email(current_user.email)

    db.query(models.Address).filter(models.Address.user_id == current_user.id).delete()
    db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).delete()

    current_user.email = f"deleted-user-{current_user.id}@deleted.invalid"
    current_user.hashed_password = auth.hash_password(os.urandom(32).hex())
    current_user.is_active = False
    current_user.deleted_at = datetime.utcnow()
    db.commit()
