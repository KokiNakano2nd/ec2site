from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/favorites", response_model=list[schemas.FavoriteOut])
def list_favorites(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()


@router.post("/favorites/{product_id}", response_model=schemas.FavoriteOut, status_code=201)
def add_favorite(
    product_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    existing = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id)
        .first()
    )
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
    fav = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id)
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
    return None
