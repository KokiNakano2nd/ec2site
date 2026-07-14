from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import auth, email_utils, models, schemas
from ..database import get_db
from ..services.checkout import (
    CouponUsageLimitError,
    EmptyCartError,
    InsufficientStockError,
    InvalidCouponError,
    place_order,
)
from ..services.order_actions import RefundError, reverse_order

router = APIRouter()


@router.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate = schemas.OrderCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    try:
        order = place_order(
            db,
            user=current_user,
            coupon_code=order_in.coupon_code,
            status="pending",
        )
    except EmptyCartError as error:
        raise HTTPException(status_code=400, detail="カートが空です") from error
    except InsufficientStockError as error:
        raise HTTPException(status_code=400, detail=f"{error.product_name}の在庫数が不足しています") from error
    except InvalidCouponError as error:
        raise HTTPException(status_code=400, detail="無効なクーポンコードです") from error
    except CouponUsageLimitError as error:
        raise HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています") from error

    email_utils.send_order_confirmation(
        user_email=current_user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )
    return order


@router.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.execute(
            select(models.Order).where(models.Order.user_id == current_user.id).order_by(models.Order.created_at.desc())
        )
        .scalars()
        .all()
    )


@router.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = db.execute(
        select(models.Order).where(models.Order.id == order_id, models.Order.user_id == current_user.id)
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    return order


@router.post("/orders/{order_id}/cancel", response_model=schemas.OrderOut)
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = db.execute(
        select(models.Order).where(models.Order.id == order_id, models.Order.user_id == current_user.id)
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    if order.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail="発送済みの注文はキャンセルできません")

    try:
        reverse_order(db, order)
    except RefundError as error:
        raise HTTPException(status_code=500, detail="返金処理に失敗しました") from error
    order.status = "cancelled"
    db.commit()
    db.refresh(order)

    email_utils.send_status_notification(order.user.email, order.id, order.status)

    order_out = schemas.OrderOut.model_validate(order)
    order_out.user_email = order.user.email
    return order_out


@router.post("/orders/{order_id}/return-request", response_model=schemas.OrderOut)
def request_order_return(
    order_id: int,
    return_in: schemas.ReturnRequestCreate = schemas.ReturnRequestCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = db.execute(
        select(models.Order).where(models.Order.id == order_id, models.Order.user_id == current_user.id)
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    if order.status != "shipped":
        raise HTTPException(status_code=400, detail="この注文は返品を申請できません")

    order.status = "return_requested"
    order.return_reason = return_in.reason or ""
    db.commit()
    db.refresh(order)

    email_utils.send_status_notification(order.user.email, order.id, order.status)

    order_out = schemas.OrderOut.model_validate(order)
    order_out.user_email = order.user.email
    return order_out
