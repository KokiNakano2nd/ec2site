from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/cart", response_model=list[schemas.CartItemOut])
def list_cart_items(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return db.execute(select(models.Cart).where(models.Cart.user_id == current_user.id)).scalars().all()


@router.post("/cart", response_model=schemas.CartItemOut, status_code=201)
def add_cart_item(
    item_in: schemas.CartItemCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, item_in.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    cart_item = db.execute(
        select(models.Cart).where(models.Cart.user_id == current_user.id, models.Cart.product_id == item_in.product_id)
    ).scalar_one_or_none()
    new_quantity = (cart_item.quantity if cart_item else 0) + item_in.quantity
    if new_quantity > product.stock:
        raise HTTPException(status_code=400, detail="在庫数を超える数量は指定できません")

    if cart_item is None:
        cart_item = models.Cart(
            user_id=current_user.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
        )
        db.add(cart_item)
    else:
        cart_item.quantity = new_quantity

    db.commit()
    db.refresh(cart_item)
    return cart_item


@router.patch("/cart/{cart_id}", response_model=schemas.CartItemOut)
def update_cart_item(
    cart_id: int,
    item_in: schemas.CartItemUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_item = db.execute(
        select(models.Cart).where(models.Cart.id == cart_id, models.Cart.user_id == current_user.id)
    ).scalar_one_or_none()
    if cart_item is None:
        raise HTTPException(status_code=404, detail="カート内に該当の商品が見つかりません")

    if item_in.quantity < 1:
        raise HTTPException(status_code=400, detail="数量は1以上を指定してください")
    if item_in.quantity > cart_item.product.stock:
        raise HTTPException(status_code=400, detail="在庫数を超える数量は指定できません")

    cart_item.quantity = item_in.quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item


@router.delete("/cart/{cart_id}", status_code=204)
def delete_cart_item(
    cart_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_item = db.execute(
        select(models.Cart).where(models.Cart.id == cart_id, models.Cart.user_id == current_user.id)
    ).scalar_one_or_none()
    if cart_item is None:
        raise HTTPException(status_code=404, detail="カート内に該当の商品が見つかりません")

    db.delete(cart_item)
    db.commit()
    return None
