from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, stripe_client
from ..logging_config import get_logger

logger = get_logger(__name__)


class RefundError(Exception):
    pass


def reverse_order(db: Session, order: models.Order) -> None:
    if order.stripe_payment_intent_id:
        try:
            stripe_client.stripe_lib.Refund.create(payment_intent=order.stripe_payment_intent_id)
        except Exception as e:
            logger.error("Stripe返金に失敗しました(order_id=%s): %s", order.id, e)
            raise RefundError from e

    for item in order.items:
        item.product.stock += item.quantity
    if order.coupon_code:
        coupon = db.execute(select(models.Coupon).where(models.Coupon.code == order.coupon_code)).scalar_one_or_none()
        if coupon and coupon.used_count > 0:
            coupon.used_count -= 1
