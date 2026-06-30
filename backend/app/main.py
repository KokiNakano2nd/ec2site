from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine, get_db

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
            models.Product(
                name="ワイヤレスイヤホン",
                description="ノイズキャンセリング機能付きのワイヤレスイヤホン",
                price=8980,
                stock=15,
                image_url="https://placehold.co/300x300?text=Earphones",
            ),
            models.Product(
                name="メカニカルキーボード",
                description="静音赤軸採用のコンパクトメカニカルキーボード",
                price=12800,
                stock=8,
                image_url="https://placehold.co/300x300?text=Keyboard",
            ),
            models.Product(
                name="モバイルバッテリー",
                description="10000mAh 大容量モバイルバッテリー",
                price=3480,
                stock=30,
                image_url="https://placehold.co/300x300?text=Battery",
            ),
        ]
        db.add_all(sample_products)
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
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


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

    total_price = sum(cart_item.quantity * cart_item.product.price for cart_item in cart_items)
    order = models.Order(user_id=current_user.id, total_price=total_price, status="completed")
    db.add(order)
    db.flush()

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
