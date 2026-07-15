import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import auth, config, email_utils, models, schemas, stripe_client
from ..database import get_db
from ..logging_config import get_logger
from ..services.checkout import (
    CheckoutAmountMismatchError,
    CheckoutSnapshotMismatchError,
    CouponUsageLimitError,
    DuplicatePaymentError,
    EmptyCartError,
    InsufficientStockError,
    InvalidCouponError,
    place_order,
    quote_fingerprint,
    quote_order,
)

router = APIRouter()
logger = get_logger(__name__)


def _checkout_http_error(error: Exception, *, empty_cart_message: str = "カートが空です") -> HTTPException:
    if isinstance(error, EmptyCartError):
        return HTTPException(status_code=400, detail=empty_cart_message)
    if isinstance(error, InsufficientStockError):
        return HTTPException(status_code=400, detail=f"{error.product_name}の在庫数が不足しています")
    if isinstance(error, InvalidCouponError):
        return HTTPException(status_code=400, detail="無効なクーポンコードです")
    if isinstance(error, CouponUsageLimitError):
        return HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています")
    raise TypeError(f"未対応のcheckout error: {type(error).__name__}")


@router.get("/config")
def get_config():
    return {"stripe_enabled": config.stripe_enabled()}


@router.post("/payment/checkout")
def create_checkout_session(
    order_in: schemas.OrderCreate = schemas.OrderCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not config.stripe_enabled():
        raise HTTPException(status_code=400, detail="Stripeが設定されていません")

    try:
        quote = quote_order(db, user_id=current_user.id, coupon_code=order_in.coupon_code)
    except (EmptyCartError, InsufficientStockError, InvalidCouponError, CouponUsageLimitError) as error:
        raise _checkout_http_error(error) from error
    total_with_tax = int(quote.total_price)

    try:
        session = stripe_client.stripe_lib.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "jpy",
                        "product_data": {"name": "TechStore ご注文"},
                        "unit_amount": total_with_tax,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=f"{config.FRONTEND_URL}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{config.FRONTEND_URL}/",
            metadata={
                "user_id": str(current_user.id),
                "coupon_code": order_in.coupon_code or "",
                "cart_fingerprint": quote_fingerprint(quote, coupon_code=order_in.coupon_code),
            },
            customer_email=current_user.email,
        )
        return {"session_url": session.url}
    except Exception as e:
        logger.error("Stripe checkout session作成に失敗しました(user_id=%s): %s", current_user.id, e)
        raise HTTPException(status_code=502, detail="決済サービスとの通信に失敗しました") from e


@router.post("/payment/complete", response_model=schemas.OrderOut)
def complete_payment(
    session_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not config.stripe_enabled():
        raise HTTPException(status_code=400, detail="Stripeが設定されていません")

    try:
        session = stripe_client.stripe_lib.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error("Stripe session取得に失敗しました(session_id=%s): %s", session_id, e)
        raise HTTPException(status_code=400, detail="決済セッションを確認できませんでした") from e

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="支払いが完了していません")
    if str(session.metadata.get("user_id")) != str(current_user.id):
        logger.warning(
            "他ユーザーの決済セッションへのアクセス試行(session_id=%s, session_user_id=%s, request_user_id=%s)",
            session_id,
            session.metadata.get("user_id"),
            current_user.id,
        )
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    payment_intent_id = str(session.payment_intent) if session.payment_intent else None
    if payment_intent_id:
        existing_order = db.execute(
            select(models.Order).where(models.Order.stripe_payment_intent_id == payment_intent_id)
        ).scalar_one_or_none()
        if existing_order is not None:
            if existing_order.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="アクセス権限がありません")
            return existing_order

    coupon_code = session.metadata.get("coupon_code") or None
    amount_total = getattr(session, "amount_total", None)
    if not isinstance(amount_total, int) or amount_total < 0:
        logger.error("Stripe sessionに有効な請求額がありません(session_id=%s)", session_id)
        raise HTTPException(status_code=400, detail="決済金額を確認できませんでした")
    expected_fingerprint = session.metadata.get("cart_fingerprint")
    if not isinstance(expected_fingerprint, str) or len(expected_fingerprint) != 64:
        logger.error("Stripe sessionに有効なカートfingerprintがありません(session_id=%s)", session_id)
        raise HTTPException(status_code=400, detail="決済対象の商品明細を確認できませんでした")
    try:
        order = place_order(
            db,
            user=current_user,
            coupon_code=coupon_code,
            status="processing",
            stripe_payment_intent_id=payment_intent_id,
            expected_total=amount_total,
            expected_fingerprint=expected_fingerprint,
        )
    except DuplicatePaymentError as error:
        existing_order = db.execute(
            select(models.Order).where(models.Order.stripe_payment_intent_id == error.payment_intent_id)
        ).scalar_one()
        if existing_order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="アクセス権限がありません") from error
        return existing_order
    except (EmptyCartError, InsufficientStockError, InvalidCouponError, CouponUsageLimitError) as error:
        raise _checkout_http_error(error, empty_cart_message="カートが空です（既に注文済みかもしれません）") from error
    except (CheckoutAmountMismatchError, CheckoutSnapshotMismatchError) as error:
        logger.warning("checkout後に注文内容が変更されました(session_id=%s, user_id=%s)", session_id, current_user.id)
        raise HTTPException(
            status_code=409, detail="決済時から注文内容が変更されたため、注文を確定できません"
        ) from error

    email_utils.send_order_confirmation(
        user_email=current_user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )
    return order


def _handle_checkout_session_completed(db: Session, event) -> None:
    """checkout.session.completedから注文を確定する。PaymentIntent単位で冪等。

    支払済みだが注文を確定できないケース(カート変更等)は、再送しても解消しないため
    エラーログに残して受理し、運用照合に委ねる(payment_complete__post.md参照)。
    """
    session = event["data"]["object"]
    event_id = event["id"]

    if session.get("payment_status") != "paid":
        return

    payment_intent_id = str(session["payment_intent"]) if session.get("payment_intent") else None
    if payment_intent_id:
        existing_order = db.execute(
            select(models.Order).where(models.Order.stripe_payment_intent_id == payment_intent_id)
        ).scalar_one_or_none()
        if existing_order is not None:
            return

    metadata = session.get("metadata") or {}
    try:
        user_id = int(metadata.get("user_id", ""))
    except ValueError:
        logger.error("Webhookのmetadataに有効なuser_idがありません(event_id=%s)", event_id)
        return
    user = db.get(models.User, user_id)
    if user is None or not user.is_active:
        logger.error("Webhookのuser_idが有効な会員でありません(event_id=%s, user_id=%s)", event_id, user_id)
        return

    amount_total = session.get("amount_total")
    expected_fingerprint = metadata.get("cart_fingerprint")
    if not isinstance(amount_total, int) or amount_total < 0:
        logger.error("Webhookのsessionに有効な請求額がありません(event_id=%s)", event_id)
        return
    if not isinstance(expected_fingerprint, str) or len(expected_fingerprint) != 64:
        logger.error("Webhookのsessionに有効なカートfingerprintがありません(event_id=%s)", event_id)
        return

    try:
        order = place_order(
            db,
            user=user,
            coupon_code=metadata.get("coupon_code") or None,
            status="processing",
            stripe_payment_intent_id=payment_intent_id,
            expected_total=amount_total,
            expected_fingerprint=expected_fingerprint,
        )
    except DuplicatePaymentError:
        return
    except (EmptyCartError, InsufficientStockError, InvalidCouponError, CouponUsageLimitError) as error:
        logger.error(
            "Webhookで注文を確定できませんでした(event_id=%s, user_id=%s): %s",
            event_id,
            user_id,
            type(error).__name__,
        )
        return
    except (CheckoutAmountMismatchError, CheckoutSnapshotMismatchError):
        logger.error(
            "Webhookの決済内容とカートが一致しません。運用照合が必要です(event_id=%s, user_id=%s)", event_id, user_id
        )
        return

    email_utils.send_order_confirmation(
        user_email=user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )


@router.post("/payment/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not config.stripe_enabled() or not config.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Stripe Webhookが設定されていません")

    payload = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    try:
        stripe_client.stripe_lib.WebhookSignature.verify_header(
            payload.decode("utf-8"), signature, config.STRIPE_WEBHOOK_SECRET
        )
        event = json.loads(payload)
    except Exception as error:
        logger.warning("Stripe Webhookの署名検証に失敗しました: %s", type(error).__name__)
        raise HTTPException(status_code=400, detail="署名を検証できませんでした") from error

    already_processed = db.execute(
        select(models.StripeWebhookEvent).where(models.StripeWebhookEvent.event_id == event["id"])
    ).scalar_one_or_none()
    if already_processed is not None:
        return {"received": True, "duplicate": True}

    if event["type"] == "checkout.session.completed":
        _handle_checkout_session_completed(db, event)

    # 台帳への記録は処理成功後に行う。途中で例外なら5xxとなりStripeが再送する
    db.add(models.StripeWebhookEvent(event_id=event["id"], event_type=event["type"]))
    try:
        db.commit()
    except IntegrityError:
        # 並行再送との競合。処理自体はPaymentIntentの一意性で冪等のため受理する
        db.rollback()
        return {"received": True, "duplicate": True}
    return {"received": True}
