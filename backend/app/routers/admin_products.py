from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import get_db

router = APIRouter()


@router.post("/admin/products", response_model=schemas.ProductOut, status_code=201)
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


@router.patch("/admin/products/{product_id}", response_model=schemas.ProductOut)
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


@router.delete("/admin/products/{product_id}", status_code=204)
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


@router.post("/admin/products/{product_id}/images", response_model=schemas.ProductImageOut, status_code=201)
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


@router.patch("/admin/product-images/{image_id}", response_model=schemas.ProductImageOut)
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


@router.delete("/admin/product-images/{image_id}", status_code=204)
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
