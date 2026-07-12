from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.patch("/admin/orders/{order_id}/return", response_model=schemas.OrderOut)
def admin_resolve_return(
    order_id: int,
    action_in: schemas.AdminReturnAction,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    from .. import main

    if action_in.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="actionはapproveまたはrejectを指定してください")

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    if order.status != "return_requested":
        raise HTTPException(status_code=400, detail="この注文は返品申請中ではありません")

    if action_in.action == "reject":
        order.status = "shipped"
    else:
        if order.stripe_payment_intent_id:
            try:
                main.stripe_lib.Refund.create(payment_intent=order.stripe_payment_intent_id)
            except Exception as e:
                main.logger.error("Stripe返金に失敗しました(order_id=%s): %s", order.id, e)
                raise HTTPException(status_code=500, detail="返金処理に失敗しました")
        for item in order.items:
            item.product.stock += item.quantity
        if order.coupon_code:
            coupon = db.query(models.Coupon).filter(models.Coupon.code == order.coupon_code).first()
            if coupon and coupon.used_count > 0:
                coupon.used_count -= 1
        order.status = "returned"

    db.commit()
    db.refresh(order)

    if action_in.action == "reject":
        main.send_return_rejected_email(order.user.email, order.id)
    else:
        main.send_status_notification(order.user.email, order.id, order.status)

    order_out = schemas.OrderOut.model_validate(order)
    order_out.user_email = order.user.email
    return order_out


@router.patch("/admin/orders/{order_id}/status", response_model=schemas.OrderOut)
def admin_update_order_status(
    order_id: int,
    status_in: schemas.OrderStatusUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    from .. import main

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    order.status = status_in.status
    db.commit()
    db.refresh(order)

    main.send_status_notification(order.user.email, order.id, status_in.status)

    order_out = schemas.OrderOut.model_validate(order)
    order_out.user_email = order.user.email
    return order_out


@router.get("/admin/orders", response_model=list[schemas.OrderOut])
def admin_list_orders(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    result = []
    for order in orders:
        order_out = schemas.OrderOut.model_validate(order)
        order_out.user_email = order.user.email
        result.append(order_out)
    return result
