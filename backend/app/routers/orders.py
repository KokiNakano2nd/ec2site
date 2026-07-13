from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, email_utils, models, schemas
from ..database import get_db
from ..services.order_actions import calculate_subtotal, fulfill_order, reverse_order
from ..services.order_calc import calculate_discount, calculate_total

router = APIRouter()


@router.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate = schemas.OrderCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_items = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="カートが空です")

    for cart_item in cart_items:
        if cart_item.quantity > cart_item.product.stock:
            raise HTTPException(
                status_code=400,
                detail=f"{cart_item.product.name}の在庫数が不足しています",
            )

    subtotal = calculate_subtotal(cart_items)

    discount_amount = 0.0
    applied_coupon = None
    if order_in.coupon_code:
        coupon = (
            db.query(models.Coupon)
            .filter(models.Coupon.code == order_in.coupon_code, models.Coupon.is_active == True)  # noqa: E712
            .first()
        )
        if coupon is None:
            raise HTTPException(status_code=400, detail="無効なクーポンコードです")
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            raise HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています")
        discount_amount = calculate_discount(subtotal, coupon)
        applied_coupon = coupon

    _discounted_subtotal, _tax, total_price = calculate_total(subtotal, discount_amount)

    return fulfill_order(
        db,
        user=current_user,
        cart_items=cart_items,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=order_in.coupon_code,
        status="pending",
        applied_coupon=applied_coupon,
    )


@router.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.user_id == current_user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    return order


@router.post("/orders/{order_id}/cancel", response_model=schemas.OrderOut)
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.user_id == current_user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    if order.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail="発送済みの注文はキャンセルできません")

    reverse_order(db, order)
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
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.user_id == current_user.id)
        .first()
    )
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
