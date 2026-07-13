from fastapi import HTTPException

from .. import email_utils, models, stripe_client
from ..logging_config import get_logger

logger = get_logger(__name__)


def calculate_subtotal(cart_items) -> float:
    return sum(item.quantity * item.product.price for item in cart_items)


def fulfill_order(
    db,
    *,
    user,
    cart_items,
    total_price: float,
    discount_amount: float,
    coupon_code: str | None,
    status: str,
    applied_coupon=None,
    stripe_payment_intent_id: str | None = None,
):
    order = models.Order(
        user_id=user.id,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=coupon_code,
        status=status,
        stripe_payment_intent_id=stripe_payment_intent_id,
    )
    db.add(order)
    db.flush()

    if applied_coupon:
        applied_coupon.used_count += 1

    for cart_item in cart_items:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            price=cart_item.product.price,
        )
        cart_item.product.stock -= cart_item.quantity
        db.add(order_item)
        db.delete(cart_item)

    db.commit()
    db.refresh(order)

    email_utils.send_order_confirmation(
        user_email=user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )

    return order


def reverse_order(db, order) -> None:
    if order.stripe_payment_intent_id:
        try:
            stripe_client.stripe_lib.Refund.create(payment_intent=order.stripe_payment_intent_id)
        except Exception as e:
            logger.error("Stripe返金に失敗しました(order_id=%s): %s", order.id, e)
            raise HTTPException(status_code=500, detail="返金処理に失敗しました")

    for item in order.items:
        item.product.stock += item.quantity
    if order.coupon_code:
        coupon = db.query(models.Coupon).filter(models.Coupon.code == order.coupon_code).first()
        if coupon and coupon.used_count > 0:
            coupon.used_count -= 1
