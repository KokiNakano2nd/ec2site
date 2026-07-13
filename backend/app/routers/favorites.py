from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/favorites", response_model=list[schemas.FavoriteOut])
def list_favorites(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return db.execute(select(models.Favorite).where(models.Favorite.user_id == current_user.id)).scalars().all()


@router.post("/favorites/{product_id}", response_model=schemas.FavoriteOut, status_code=201)
def add_favorite(
    product_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    existing = db.execute(
        select(models.Favorite).where(
            models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id
        )
    ).scalar_one_or_none()
    if existing:
        return existing
    fav = models.Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/favorites/{product_id}", status_code=204)
def remove_favorite(
    product_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    fav = db.execute(
        select(models.Favorite).where(
            models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id
        )
    ).scalar_one_or_none()
    if fav:
        db.delete(fav)
        db.commit()
    return None
