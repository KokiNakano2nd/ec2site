from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/coupons/validate", response_model=schemas.CouponValidateOut)
def validate_coupon(code: str, db: Session = Depends(get_db)):
    coupon = db.execute(
        select(models.Coupon).where(models.Coupon.code == code, models.Coupon.is_active == True)  # noqa: E712
    ).scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=404, detail="無効なクーポンコードです")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています")
    return schemas.CouponValidateOut(
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
    )
