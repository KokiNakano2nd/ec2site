from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth, models
from ..database import get_db

router = APIRouter()


@router.get("/admin/analytics/summary")
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


@router.get("/admin/analytics/sales-by-date")
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


@router.get("/admin/analytics/top-products")
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


@router.get("/admin/analytics/category-sales")
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
