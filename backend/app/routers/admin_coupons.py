from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/admin/coupons", response_model=list[schemas.CouponOut])
def admin_list_coupons(
    admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Coupon).order_by(models.Coupon.created_at.desc()).all()


@router.post("/admin/coupons", response_model=schemas.CouponOut, status_code=201)
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


@router.patch("/admin/coupons/{coupon_id}", response_model=schemas.CouponOut)
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


@router.delete("/admin/coupons/{coupon_id}", status_code=204)
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
