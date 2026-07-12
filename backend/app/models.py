from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    low_stock_threshold = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    images = relationship("ProductImage", back_populates="product", order_by="ProductImage.display_order", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    image_url = Column(String, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="images")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    carts = relationship("Cart", back_populates="user")
    orders = relationship("Order", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    prefecture = Column(String, nullable=False)
    city = Column(String, nullable=False)
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    user = relationship("User", back_populates="carts")
    product = relationship("Product")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    discount_type = Column(String, nullable=False)  # "percentage" or "fixed"
    discount_value = Column(Float, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_price = Column(Float, nullable=False)
    discount_amount = Column(Float, nullable=False, default=0)
    coupon_code = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    stripe_payment_intent_id = Column(String, nullable=True)
    return_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    product = relationship("Product")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    product = relationship("Product")
