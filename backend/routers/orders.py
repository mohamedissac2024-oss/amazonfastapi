from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user
from orm import OrderError, orders_repo
from schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def place_order(payload: OrderCreate, user=Depends(get_current_user)):
    try:
        return orders_repo.create(user["id"], [item.model_dump() for item in payload.items])
    except OrderError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[OrderOut])
def my_orders(user=Depends(get_current_user)):
    return orders_repo.list_for_user(user["id"])


@router.get("/{order_id}", response_model=OrderOut)
def my_order(order_id: int, user=Depends(get_current_user)):
    order = orders_repo.get_for_user(order_id, user["id"])
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
