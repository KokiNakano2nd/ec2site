from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db
from ..services.order_calc import calculate_discount, calculate_total

router = APIRouter()


@router.get("/config")
def get_config():
    from .. import main

    return {"stripe_enabled": bool(main.STRIPE_SECRET_KEY)}


@router.post("/payment/checkout")
def create_checkout_session(
    order_in: schemas.OrderCreate = schemas.OrderCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    from .. import main

    if not main.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripeが設定されていません")

    cart_items = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="カートが空です")

    subtotal = sum(item.quantity * item.product.price for item in cart_items)
    discount_amount = 0.0
    if order_in.coupon_code:
        coupon = (
            db.query(models.Coupon)
            .filter(models.Coupon.code == order_in.coupon_code, models.Coupon.is_active == True)  # noqa: E712
            .first()
        )
        discount_amount = calculate_discount(subtotal, coupon)

    discounted = subtotal - discount_amount
    total_with_tax = int(discounted * 1.1)

    try:
        session = main.stripe_lib.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "jpy",
                    "product_data": {"name": "TechStore ご注文"},
                    "unit_amount": total_with_tax,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{main.FRONTEND_URL}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{main.FRONTEND_URL}/",
            metadata={
                "user_id": str(current_user.id),
                "coupon_code": order_in.coupon_code or "",
            },
            customer_email=current_user.email,
        )
        return {"session_url": session.url}
    except Exception as e:
        main.logger.error("Stripe checkout session作成に失敗しました(user_id=%s): %s", current_user.id, e)
        raise HTTPException(status_code=500, detail=f"Stripe エラー: {str(e)}")


@router.post("/payment/complete", response_model=schemas.OrderOut)
def complete_payment(
    session_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    from .. import main

    if not main.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripeが設定されていません")

    try:
        session = main.stripe_lib.checkout.Session.retrieve(session_id)
    except Exception as e:
        main.logger.error("Stripe session取得に失敗しました(session_id=%s): %s", session_id, e)
        raise HTTPException(status_code=400, detail=f"セッション取得失敗: {str(e)}")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="支払いが完了していません")
    if str(session.metadata.get("user_id")) != str(current_user.id):
        main.logger.warning(
            "他ユーザーの決済セッションへのアクセス試行(session_id=%s, session_user_id=%s, request_user_id=%s)",
            session_id, session.metadata.get("user_id"), current_user.id,
        )
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    cart_items = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="カートが空です（既に注文済みかもしれません）")

    coupon_code = session.metadata.get("coupon_code") or None
    subtotal = sum(item.quantity * item.product.price for item in cart_items)
    discount_amount = 0.0
    applied_coupon = None
    if coupon_code:
        coupon = (
            db.query(models.Coupon)
            .filter(models.Coupon.code == coupon_code, models.Coupon.is_active == True)  # noqa: E712
            .first()
        )
        if coupon:
            discount_amount = calculate_discount(subtotal, coupon)
            applied_coupon = coupon

    _discounted_subtotal, _tax, total_price = calculate_total(subtotal, discount_amount)

    order = models.Order(
        user_id=current_user.id,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=coupon_code,
        status="processing",
        stripe_payment_intent_id=session.payment_intent,
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

    main.send_order_confirmation(
        user_email=current_user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )

    return order
