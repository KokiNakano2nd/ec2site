import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/products", response_model=list[schemas.ProductOut])
def list_products(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if q:
        query = query.filter(
            models.Product.name.ilike(f"%{q}%") | models.Product.description.ilike(f"%{q}%")
        )
    return query.all()


@router.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{product_id}/recommendations", response_model=list[schemas.ProductOut])
def get_recommendations(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.category:
        candidates = (
            db.query(models.Product)
            .filter(models.Product.category == product.category, models.Product.id != product_id)
            .all()
        )
    else:
        candidates = db.query(models.Product).filter(models.Product.id != product_id).all()
    return random.sample(candidates, min(4, len(candidates)))


@router.get("/products/{product_id}/reviews", response_model=list[schemas.ReviewOut])
def list_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .filter(models.Review.product_id == product_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )
    result = []
    for r in reviews:
        out = schemas.ReviewOut.model_validate(r)
        out.user_email = r.user.email
        result.append(out)
    return result


@router.post("/products/{product_id}/reviews", response_model=schemas.ReviewOut, status_code=201)
def create_review(
    product_id: int,
    review_in: schemas.ReviewCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(models.Product).filter(models.Product.id == product_id).first() is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    if not (1 <= review_in.rating <= 5):
        raise HTTPException(status_code=400, detail="評価は1〜5で指定してください")
    existing = (
        db.query(models.Review)
        .filter(models.Review.user_id == current_user.id, models.Review.product_id == product_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="すでにレビューを投稿済みです")
    review = models.Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=review_in.rating,
        comment=review_in.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    out = schemas.ReviewOut.model_validate(review)
    out.user_email = current_user.email
    return out


@router.get("/products/{product_id}/images", response_model=list[schemas.ProductImageOut])
def list_product_images(product_id: int, db: Session = Depends(get_db)):
    if db.query(models.Product).filter(models.Product.id == product_id).first() is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    return (
        db.query(models.ProductImage)
        .filter(models.ProductImage.product_id == product_id)
        .order_by(models.ProductImage.display_order)
        .all()
    )
