from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/addresses", response_model=list[schemas.AddressOut])
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


@router.post("/addresses", response_model=schemas.AddressOut, status_code=201)
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


@router.patch("/addresses/{address_id}", response_model=schemas.AddressOut)
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


@router.delete("/addresses/{address_id}", status_code=204)
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


@router.post("/addresses/{address_id}/default", response_model=schemas.AddressOut)
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
