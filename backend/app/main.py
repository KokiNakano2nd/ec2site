from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from . import auth, models, stripe_client  # noqa: F401 -- import triggers Stripe API key setup
from .database import Base, engine, get_db
from .logging_config import get_logger
from .routers import (
    addresses,
    admin_analytics,
    admin_coupons,
    admin_orders,
    admin_products,
    cart,
    coupons,
    favorites,
    orders,
    payment,
    products,
    users,
)

logger = get_logger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EC Site API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(users.router)
app.include_router(cart.router)
app.include_router(favorites.router)
app.include_router(addresses.router)
app.include_router(admin_products.router)
app.include_router(coupons.router)
app.include_router(admin_coupons.router)
app.include_router(admin_analytics.router)
app.include_router(orders.router)
app.include_router(admin_orders.router)
app.include_router(payment.router)


@app.on_event("startup")
def seed_products():
    db = next(get_db())
    if db.execute(select(func.count(models.Product.id))).scalar() == 0:
        sample_products = [
            models.Product(
                name="ワイヤレスイヤホン",
                description="ノイズキャンセリング機能付きのワイヤレスイヤホン",
                price=8980,
                stock=15,
                image_url="https://placehold.co/300x300?text=Earphones",
                category="オーディオ",
            ),
            models.Product(
                name="メカニカルキーボード",
                description="静音赤軸採用のコンパクトメカニカルキーボード",
                price=12800,
                stock=8,
                image_url="https://placehold.co/300x300?text=Keyboard",
                category="PC周辺機器",
            ),
            models.Product(
                name="モバイルバッテリー",
                description="10000mAh 大容量モバイルバッテリー",
                price=3480,
                stock=30,
                image_url="https://placehold.co/300x300?text=Battery",
                category="モバイル",
            ),
            models.Product(
                name="Bluetoothスピーカー",
                description="防水対応のポータブルBluetoothスピーカー",
                price=5980,
                stock=20,
                image_url="https://placehold.co/300x300?text=Speaker",
                category="オーディオ",
            ),
            models.Product(
                name="USBハブ",
                description="7ポートUSB3.0ハブ、急速充電対応",
                price=2480,
                stock=40,
                image_url="https://placehold.co/300x300?text=USB+Hub",
                category="PC周辺機器",
            ),
            models.Product(
                name="スマートウォッチ",
                description="心拍数・血中酸素計測対応のスマートウォッチ",
                price=19800,
                stock=12,
                image_url="https://placehold.co/300x300?text=Watch",
                category="モバイル",
            ),
            models.Product(
                name="ウェブカメラ",
                description="4K対応 オートフォーカスウェブカメラ",
                price=7800,
                stock=18,
                image_url="https://placehold.co/300x300?text=Webcam",
                category="PC周辺機器",
            ),
            models.Product(
                name="ノイズキャンセリングヘッドホン",
                description="ハイレゾ対応 折り畳み式ヘッドホン",
                price=24800,
                stock=6,
                image_url="https://placehold.co/300x300?text=Headphone",
                category="オーディオ",
            ),
            models.Product(
                name="スマートフォンスタンド",
                description="角度調整可能なアルミ製スマートフォンスタンド",
                price=1980,
                stock=50,
                image_url="https://placehold.co/300x300?text=Stand",
                category="モバイル",
            ),
        ]
        db.add_all(sample_products)
        db.commit()
    db.close()


@app.on_event("startup")
def seed_coupons():
    db = next(get_db())
    if db.execute(select(func.count(models.Coupon.id))).scalar() == 0:
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
    if db.execute(select(models.User).where(models.User.is_admin == True)).scalar_one_or_none() is None:  # noqa: E712
        admin = models.User(
            email="admin@example.com",
            hashed_password=auth.hash_password("admin12345"),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
    db.close()
