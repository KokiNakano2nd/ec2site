from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..services.checkout import CouponUsageLimitError, InvalidCouponError, get_valid_coupon

router = APIRouter()


@router.get("/coupons/validate", response_model=schemas.CouponValidateOut)
def validate_coupon(code: str, db: Session = Depends(get_db)):
    try:
        coupon = get_valid_coupon(db, code)
    except InvalidCouponError as error:
        raise HTTPException(status_code=404, detail="無効なクーポンコードです") from error
    except CouponUsageLimitError as error:
        raise HTTPException(status_code=400, detail="このクーポンは使用回数の上限に達しています") from error
    return schemas.CouponValidateOut(
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
    )
