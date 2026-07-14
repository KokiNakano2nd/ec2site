import hashlib
import json
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models
from .order_calc import calculate_discount, calculate_total


class CheckoutError(Exception):
    pass


class EmptyCartError(CheckoutError):
    pass


class InsufficientStockError(CheckoutError):
    def __init__(self, product_name: str) -> None:
        self.product_name = product_name
        super().__init__(product_name)


class InvalidCouponError(CheckoutError):
    pass


class CouponUsageLimitError(CheckoutError):
    pass


class DuplicatePaymentError(CheckoutError):
    def __init__(self, payment_intent_id: str) -> None:
        self.payment_intent_id = payment_intent_id
        super().__init__(payment_intent_id)


class CheckoutAmountMismatchError(CheckoutError):
    pass


class CheckoutSnapshotMismatchError(CheckoutError):
    pass


@dataclass(frozen=True)
class OrderQuote:
    cart_items: list[models.Cart]
    subtotal: float
    discount_amount: float
    total_price: float
    applied_coupon: models.Coupon | None


def quote_fingerprint(quote: OrderQuote, *, coupon_code: str | None) -> str:
    snapshot = {
        "coupon_code": coupon_code or "",
        "discount_amount": str(quote.discount_amount),
        "items": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": str(item.product.price),
            }
            for item in sorted(quote.cart_items, key=lambda item: item.product_id)
        ],
        "total_price": str(quote.total_price),
    }
    canonical = json.dumps(snapshot, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def get_valid_coupon(db: Session, coupon_code: str) -> models.Coupon:
    coupon = db.execute(
        select(models.Coupon).where(
            models.Coupon.code == coupon_code,
            models.Coupon.is_active == True,  # noqa: E712
        )
    ).scalar_one_or_none()
    if coupon is None:
        raise InvalidCouponError
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise CouponUsageLimitError
    return coupon


def quote_order(db: Session, *, user_id: int, coupon_code: str | None) -> OrderQuote:
    cart_items = db.execute(select(models.Cart).where(models.Cart.user_id == user_id)).scalars().all()
    if not cart_items:
        raise EmptyCartError

    for cart_item in cart_items:
        if cart_item.quantity > cart_item.product.stock:
            raise InsufficientStockError(cart_item.product.name)

    subtotal = sum(item.quantity * item.product.price for item in cart_items)
    applied_coupon = get_valid_coupon(db, coupon_code) if coupon_code else None
    discount_amount = calculate_discount(subtotal, applied_coupon)
    _discounted_subtotal, _tax, total_price = calculate_total(subtotal, discount_amount)
    return OrderQuote(
        cart_items=cart_items,
        subtotal=subtotal,
        discount_amount=discount_amount,
        total_price=total_price,
        applied_coupon=applied_coupon,
    )


def place_order(
    db: Session,
    *,
    user: models.User,
    coupon_code: str | None,
    status: str,
    stripe_payment_intent_id: str | None = None,
    expected_total: int | None = None,
    expected_fingerprint: str | None = None,
) -> models.Order:
    try:
        quote = quote_order(db, user_id=user.id, coupon_code=coupon_code)
        if expected_total is not None and int(quote.total_price) != expected_total:
            raise CheckoutAmountMismatchError
        if (
            expected_fingerprint is not None
            and quote_fingerprint(quote, coupon_code=coupon_code) != expected_fingerprint
        ):
            raise CheckoutSnapshotMismatchError
        order = models.Order(
            user_id=user.id,
            total_price=quote.total_price,
            discount_amount=quote.discount_amount,
            coupon_code=coupon_code,
            status=status,
            stripe_payment_intent_id=stripe_payment_intent_id,
        )
        db.add(order)
        db.flush()

        if quote.applied_coupon is not None:
            quote.applied_coupon.used_count += 1

        for cart_item in quote.cart_items:
            db.add(
                models.OrderItem(
                    order_id=order.id,
                    product_id=cart_item.product_id,
                    quantity=cart_item.quantity,
                    price=cart_item.product.price,
                )
            )
            cart_item.product.stock -= cart_item.quantity
            db.delete(cart_item)

        db.commit()
    except IntegrityError as error:
        db.rollback()
        if stripe_payment_intent_id is not None:
            existing_order = db.execute(
                select(models.Order).where(models.Order.stripe_payment_intent_id == stripe_payment_intent_id)
            ).scalar_one_or_none()
            if existing_order is not None:
                raise DuplicatePaymentError(stripe_payment_intent_id) from error
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return order
