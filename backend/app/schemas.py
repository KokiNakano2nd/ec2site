from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    price: float
    stock: int
    image_url: str | None = None
    category: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    stock: int | None = None
    image_url: str | None = None
    category: str | None = None


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    display_order: int


class ProductImageCreate(BaseModel):
    image_url: str
    display_order: int = 0


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    images: list[ProductImageOut] = []


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_admin: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quantity: int
    product: ProductOut


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quantity: int
    price: float
    product: ProductOut


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total_price: float
    discount_amount: float = 0
    coupon_code: str | None = None
    status: str
    created_at: datetime
    items: list[OrderItemOut]
    user_email: str | None = None


class OrderCreate(BaseModel):
    coupon_code: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class CouponCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    max_uses: int | None = None


class CouponOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    discount_type: str
    discount_value: float
    is_active: bool
    max_uses: int | None = None
    used_count: int
    created_at: datetime


class CouponValidateOut(BaseModel):
    code: str
    discount_type: str
    discount_value: float


class FavoriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product: ProductOut


class ReviewCreate(BaseModel):
    rating: int
    comment: str | None = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    comment: str | None = None
    created_at: datetime
    user_email: str | None = None


class AddressCreate(BaseModel):
    name: str
    postal_code: str
    prefecture: str
    city: str
    address_line1: str
    address_line2: str | None = None
    phone: str | None = None
    is_default: bool = False


class AddressUpdate(BaseModel):
    name: str | None = None
    postal_code: str | None = None
    prefecture: str | None = None
    city: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    phone: str | None = None
    is_default: bool | None = None


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    postal_code: str
    prefecture: str
    city: str
    address_line1: str
    address_line2: str | None = None
    phone: str | None = None
    is_default: bool
    created_at: datetime
