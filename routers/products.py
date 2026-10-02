from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from psycopg2.errors import ForeignKeyViolation

from auth import require_admin
from config import MAX_IMAGE_BYTES, UPLOAD_DIR
from orm import products_repo
from schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])

ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _get_or_404(product_id: int):
    product = products_repo.get(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _delete_local_image(image_url: Optional[str]):
    """Removes an old uploaded file (only files inside our uploads folder)."""
    if not image_url or not image_url.startswith("/uploads/"):
        return
    path = (UPLOAD_DIR / image_url[len("/uploads/"):]).resolve()
    try:
        path.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return
    path.unlink(missing_ok=True)


# ---------------------------------------------------------- public routes
@router.get("", response_model=List[ProductOut])
def search_products(
    search: Optional[str] = Query(None, description="Matches product name or description"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return products_repo.list_all(search=search, limit=limit, offset=offset)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int):
    return _get_or_404(product_id)


# ----------------------------------------------------------- admin routes
@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, admin=Depends(require_admin)):
    return products_repo.create(payload.name, payload.description, payload.price, payload.stock)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, admin=Depends(require_admin)):
    _get_or_404(product_id)
    return products_repo.update(product_id, payload.model_dump(exclude_unset=True))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, admin=Depends(require_admin)):
    product = _get_or_404(product_id)
    try:
        products_repo.delete(product_id)
    except ForeignKeyViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This product is part of existing orders and cannot be deleted. Set its stock to 0 instead.",
        )
    _delete_local_image(product["image_url"])


@router.post("/{product_id}/image", response_model=ProductOut)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    product = _get_or_404(product_id)

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG or WEBP images are allowed",
        )

    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image is larger than {MAX_IMAGE_BYTES // (1024 * 1024)} MB",
        )

    folder = UPLOAD_DIR / "products"
    folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"  # our own name, never the user's file name
    (folder / filename).write_bytes(data)

    updated = products_repo.set_image(product_id, f"/uploads/products/{filename}")
    _delete_local_image(product["image_url"])
    return updated
