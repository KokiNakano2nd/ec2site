import os
import random
import stripe as stripe_lib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine, get_db
from .email_utils import send_order_confirmation, send_status_notification

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")
if STRIPE_SECRET_KEY:
    stripe_lib.api_key = STRIPE_SECRET_KEY

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EC Site API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def seed_products():
    db = next(get_db())
    if db.query(models.Product).count() == 0:
        sample_products = [
            models.Product(name="ワイヤレスイヤホン", description="ノイズキャンセリング機能付きのワイヤレスイヤホン", price=8980, stock=15, image_url="https://placehold.co/300x300?text=Earphones", category="オーディオ"),
            models.Product(name="メカニカルキーボード", description="静音赤軸採用のコンパクトメカニカルキーボード", price=12800, stock=8, image_url="https://placehold.co/300x300?text=Keyboard", category="PC周辺機器"),
            models.Product(name="モバイルバッテリー", description="10000mAh 大容量モバイルバッテリー", price=3480, stock=30, image_url="https://placehold.co/300x300?text=Battery", category="モバイル"),
            models.Product(name="Bluetoothスピーカー", description="防水対応のポータブルBluetoothスピーカー", price=5980, stock=20, image_url="https://placehold.co/300x300?text=Speaker", category="オーディオ"),
            models.Product(name="USBハブ", description="7ポートUSB3.0ハブ、急速充電対応", price=2480, stock=40, image_url="https://placehold.co/300x300?text=USB+Hub", category="PC周辺機器"),
            models.Product(name="スマートウォッチ", description="心拍数・血中酸素計測対応のスマートウォッチ", price=19800, stock=12, image_url="https://placehold.co/300x300?text=Watch", category="モバイル"),
            models.Product(name="ウェブカメラ", description="4K対応 オートフォーカスウェブカメラ", price=7800, stock=18, image_url="https://placehold.co/300x300?text=Webcam", category="PC周辺機器"),
            models.Product(name="ノイズキャンセリングヘッドホン", description="ハイレゾ対応 折り畳み式ヘッドホン", price=24800, stock=6, image_url="https://placehold.co/300x300?text=Headphone", category="オーディオ"),
            models.Product(name="スマートフォンスタンド", description="角度調整可能なアルミ製スマートフォンスタンド", price=1980, stock=50, image_url="https://placehold.co/300x300?text=Stand", category="モバイル"),
        ]
        db.add_all(sample_products)
        db.commit()
    db.close()


@app.on_event("startup")
def seed_coupons():
    db = next(get_db())
    if db.query(models.Coupon).count() == 0:
        sample_coupons = [
            models.Coupon(code="WELCOME10", discount_type="percentage", discount_value=10, is_active=True),
            models.Coupon(code="SAVE500", discount_type="fixed", discount_value=500, is_active=True),
            models.Coupon(code="SUMMER20", discount_type="percentage", discount_value=20, is_active=False),
        ]
        db.add_all(sample_coupons)
        db.commit()
    db.close()


@app.on_event("startup")
def seed_admin():
    db = next(get_db())
    if db.query(models.User).filter(models.User.is_admin == True).first() is None:  # noqa: E712
        admin = models.User(
            email="admin@example.com",
            hashed_password=auth.hash_password("admin12345"),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
    db.close()


@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if q:
        query = query.filter(
            models.Product.name.ilike(f"%{q}%") | models.Product.description.ilike(f"%{q}%")
        )
    return query.all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    user = models.User(
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if user is None or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return schemas.Token(access_token=access_token)


@app.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/cart", response_model=list[schemas.CartItemOut])
def list_cart_items(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Cart).filter(models.Cart.user_id == current_user.id).all()


@app.post("/cart", response_model=schemas.CartItemOut, status_code=201)
def add_cart_item(
    item_in: schemas.CartItemCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == item_in.product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    cart_item = (
        db.query(models.Cart)
        .filter(models.Cart.user_id == current_user.id, models.Cart.product_id == item_in.product_id)
        .first()
    )
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


@app.patch("/cart/{cart_id}", response_model=schemas.CartItemOut)
def update_cart_item(
    cart_id: int,
    item_in: schemas.CartItemUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_item = (
        db.query(models.Cart)
        .filter(models.Cart.id == cart_id, models.Cart.user_id == current_user.id)
        .first()
    )
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


@app.delete("/cart/{cart_id}", status_code=204)
def delete_cart_item(
    cart_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_item = (
        db.query(models.Cart)
        .filter(models.Cart.id == cart_id, models.Cart.user_id == current_user.id)
        .first()
    )
    if cart_item is None:
        raise HTTPException(status_code=404, detail="カート内に該当の商品が見つかりません")

    db.delete(cart_item)
    db.commit()
    return None


@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
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

    subtotal = sum(cart_item.quantity * cart_item.product.price for cart_item in cart_items)

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
        if coupon.discount_type == "percentage":
            discount_amount = subtotal * coupon.discount_value / 100
        else:
            discount_amount = min(coupon.discount_value, subtotal)
        applied_coupon = coupon

    discounted_subtotal = subtotal - discount_amount
    tax = discounted_subtotal * 0.1
    total_price = discounted_subtotal + tax

    order = models.Order(
        user_id=current_user.id,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=order_in.coupon_code,
        status="pending",
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

    send_order_confirmation(
        user_email=current_user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )

    return order


@app.get("/orders", response_model=list[schemas.OrderOut])
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


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
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


@app.get("/products/{product_id}/recommendations", response_model=list[schemas.ProductOut])
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


@app.get("/coupons/validate", response_model=schemas.CouponValidateOut)
def validate_coupon(code: str, db: Session = Depends(get_db)):
    coupon = (
        db.query(models.Coupon)
        .filter(models.Coupon.code == code, models.Coupon.is_active == True)  # noqa: E712
        .first()
    )
    if coupon is None:
        raise HTTPException(status_code=404, detail="無効なクーポンコードです")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています")
    return schemas.CouponValidateOut(
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
    )


@app.get("/admin/coupons", response_model=list[schemas.CouponOut])
def admin_list_coupons(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Coupon).order_by(models.Coupon.created_at.desc()).all()


@app.post("/admin/coupons", response_model=schemas.CouponOut, status_code=201)
def admin_create_coupon(
    coupon_in: schemas.CouponCreate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    if coupon_in.discount_type not in ("percentage", "fixed"):
        raise HTTPException(status_code=400, detail="discount_typeは percentage または fixed を指定してください")
    existing = db.query(models.Coupon).filter(models.Coupon.code == coupon_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="このクーポンコードはすでに存在します")
    coupon = models.Coupon(**coupon_in.model_dump())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@app.patch("/admin/coupons/{coupon_id}", response_model=schemas.CouponOut)
def admin_toggle_coupon(
    coupon_id: int,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if coupon is None:
        raise HTTPException(status_code=404, detail="クーポンが見つかりません")
    coupon.is_active = not coupon.is_active
    db.commit()
    db.refresh(coupon)
    return coupon


@app.delete("/admin/coupons/{coupon_id}", status_code=204)
def admin_delete_coupon(
    coupon_id: int,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if coupon is None:
        raise HTTPException(status_code=404, detail="クーポンが見つかりません")
    db.delete(coupon)
    db.commit()
    return None


@app.get("/favorites", response_model=list[schemas.FavoriteOut])
def list_favorites(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()


@app.post("/favorites/{product_id}", response_model=schemas.FavoriteOut, status_code=201)
def add_favorite(
    product_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    existing = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id)
        .first()
    )
    if existing:
        return existing
    fav = models.Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@app.delete("/favorites/{product_id}", status_code=204)
def remove_favorite(
    product_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.product_id == product_id)
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
    return None


@app.get("/products/{product_id}/reviews", response_model=list[schemas.ReviewOut])
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


@app.post("/products/{product_id}/reviews", response_model=schemas.ReviewOut, status_code=201)
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


@app.post("/admin/products", response_model=schemas.ProductOut, status_code=201)
def admin_create_product(
    product_in: schemas.ProductCreate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    product = models.Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.patch("/admin/products/{product_id}", response_model=schemas.ProductOut)
def admin_update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@app.delete("/admin/products/{product_id}", status_code=204)
def admin_delete_product(
    product_id: int,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    db.delete(product)
    db.commit()
    return None


@app.patch("/admin/orders/{order_id}/status", response_model=schemas.OrderOut)
def admin_update_order_status(
    order_id: int,
    status_in: schemas.OrderStatusUpdate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    order.status = status_in.status
    db.commit()
    db.refresh(order)

    send_status_notification(order.user.email, order.id, status_in.status)

    order_out = schemas.OrderOut.model_validate(order)
    order_out.user_email = order.user.email
    return order_out


@app.get("/admin/orders", response_model=list[schemas.OrderOut])
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


@app.get("/products/{product_id}/images", response_model=list[schemas.ProductImageOut])
def list_product_images(product_id: int, db: Session = Depends(get_db)):
    if db.query(models.Product).filter(models.Product.id == product_id).first() is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    return (
        db.query(models.ProductImage)
        .filter(models.ProductImage.product_id == product_id)
        .order_by(models.ProductImage.display_order)
        .all()
    )


@app.post("/admin/products/{product_id}/images", response_model=schemas.ProductImageOut, status_code=201)
def admin_add_product_image(
    product_id: int,
    image_in: schemas.ProductImageCreate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(models.Product).filter(models.Product.id == product_id).first() is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    image = models.ProductImage(
        product_id=product_id,
        image_url=image_in.image_url,
        display_order=image_in.display_order,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@app.patch("/admin/product-images/{image_id}", response_model=schemas.ProductImageOut)
def admin_update_product_image(
    image_id: int,
    image_in: schemas.ProductImageCreate,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    image = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="画像が見つかりません")
    image.image_url = image_in.image_url
    image.display_order = image_in.display_order
    db.commit()
    db.refresh(image)
    return image


@app.delete("/admin/product-images/{image_id}", status_code=204)
def admin_delete_product_image(
    image_id: int,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    image = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="画像が見つかりません")
    db.delete(image)
    db.commit()
    return None


# ── Analytics ─────────────────────────────────────────────────────────────────

@app.get("/admin/analytics/summary")
def admin_analytics_summary(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    total_revenue = db.query(func.sum(models.Order.total_price)).scalar() or 0
    order_count = db.query(func.count(models.Order.id)).scalar() or 0
    user_count = (
        db.query(func.count(models.User.id))
        .filter(models.User.is_admin == False)  # noqa: E712
        .scalar()
        or 0
    )
    product_count = db.query(func.count(models.Product.id)).scalar() or 0
    avg_order = total_revenue / order_count if order_count > 0 else 0
    return {
        "total_revenue": float(total_revenue),
        "order_count": int(order_count),
        "user_count": int(user_count),
        "product_count": int(product_count),
        "avg_order": float(avg_order),
    }


@app.get("/admin/analytics/sales-by-date")
def admin_analytics_sales_by_date(
    days: int = 30,
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            func.date(models.Order.created_at).label("date"),
            func.sum(models.Order.total_price).label("revenue"),
            func.count(models.Order.id).label("count"),
        )
        .filter(models.Order.created_at >= since)
        .group_by(func.date(models.Order.created_at))
        .order_by(func.date(models.Order.created_at))
        .all()
    )
    return [{"date": str(r.date), "revenue": float(r.revenue), "count": int(r.count)} for r in rows]


@app.get("/admin/analytics/top-products")
def admin_analytics_top_products(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.Product.name,
            func.sum(models.OrderItem.quantity).label("total_qty"),
            func.sum(models.OrderItem.quantity * models.OrderItem.price).label("total_revenue"),
        )
        .join(models.OrderItem, models.Product.id == models.OrderItem.product_id)
        .group_by(models.Product.id, models.Product.name)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    return [
        {"name": r.name, "total_qty": int(r.total_qty), "total_revenue": float(r.total_revenue)}
        for r in rows
    ]


@app.get("/admin/analytics/category-sales")
def admin_analytics_category_sales(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.Product.category,
            func.sum(models.OrderItem.quantity * models.OrderItem.price).label("revenue"),
        )
        .join(models.OrderItem, models.Product.id == models.OrderItem.product_id)
        .group_by(models.Product.category)
        .all()
    )
    return [{"category": r.category or "未分類", "revenue": float(r.revenue or 0)} for r in rows]


# ── Addresses ─────────────────────────────────────────────────────────────────

@app.get("/addresses", response_model=list[schemas.AddressOut])
def list_addresses(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Address)
        .filter(models.Address.user_id == current_user.id)
        .order_by(models.Address.is_default.desc(), models.Address.created_at.desc())
        .all()
    )


@app.post("/addresses", response_model=schemas.AddressOut, status_code=201)
def create_address(
    address_in: schemas.AddressCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if address_in.is_default:
        db.query(models.Address).filter(models.Address.user_id == current_user.id).update({"is_default": False})
    address = models.Address(user_id=current_user.id, **address_in.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@app.patch("/addresses/{address_id}", response_model=schemas.AddressOut)
def update_address(
    address_id: int,
    address_in: schemas.AddressUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    address = (
        db.query(models.Address)
        .filter(models.Address.id == address_id, models.Address.user_id == current_user.id)
        .first()
    )
    if address is None:
        raise HTTPException(status_code=404, detail="住所が見つかりません")
    if address_in.is_default:
        db.query(models.Address).filter(models.Address.user_id == current_user.id).update({"is_default": False})
    for field, value in address_in.model_dump(exclude_unset=True).items():
        setattr(address, field, value)
    db.commit()
    db.refresh(address)
    return address


@app.delete("/addresses/{address_id}", status_code=204)
def delete_address(
    address_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    address = (
        db.query(models.Address)
        .filter(models.Address.id == address_id, models.Address.user_id == current_user.id)
        .first()
    )
    if address is None:
        raise HTTPException(status_code=404, detail="住所が見つかりません")
    db.delete(address)
    db.commit()
    return None


@app.post("/addresses/{address_id}/default", response_model=schemas.AddressOut)
def set_default_address(
    address_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Address).filter(models.Address.user_id == current_user.id).update({"is_default": False})
    address = (
        db.query(models.Address)
        .filter(models.Address.id == address_id, models.Address.user_id == current_user.id)
        .first()
    )
    if address is None:
        raise HTTPException(status_code=404, detail="住所が見つかりません")
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address


# ── Stripe Payment ─────────────────────────────────────────────────────────────

@app.get("/config")
def get_config():
    return {"stripe_enabled": bool(STRIPE_SECRET_KEY)}


@app.post("/payment/checkout")
def create_checkout_session(
    order_in: schemas.OrderCreate = schemas.OrderCreate(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
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
        if coupon:
            if coupon.discount_type == "percentage":
                discount_amount = subtotal * coupon.discount_value / 100
            else:
                discount_amount = min(coupon.discount_value, subtotal)

    discounted = subtotal - discount_amount
    total_with_tax = int(discounted * 1.1)

    try:
        session = stripe_lib.checkout.Session.create(
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
            success_url=f"{FRONTEND_URL}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/",
            metadata={
                "user_id": str(current_user.id),
                "coupon_code": order_in.coupon_code or "",
            },
            customer_email=current_user.email,
        )
        return {"session_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe エラー: {str(e)}")


@app.post("/payment/complete", response_model=schemas.OrderOut)
def complete_payment(
    session_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripeが設定されていません")

    try:
        session = stripe_lib.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"セッション取得失敗: {str(e)}")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="支払いが完了していません")
    if str(session.metadata.get("user_id")) != str(current_user.id):
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
            if coupon.discount_type == "percentage":
                discount_amount = subtotal * coupon.discount_value / 100
            else:
                discount_amount = min(coupon.discount_value, subtotal)
            applied_coupon = coupon

    discounted_subtotal = subtotal - discount_amount
    tax = discounted_subtotal * 0.1
    total_price = discounted_subtotal + tax

    order = models.Order(
        user_id=current_user.id,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=coupon_code,
        status="processing",
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

    send_order_confirmation(
        user_email=current_user.email,
        order_id=order.id,
        total_price=order.total_price,
        items=[{"name": item.product.name, "quantity": item.quantity, "price": item.price} for item in order.items],
    )

    return order
