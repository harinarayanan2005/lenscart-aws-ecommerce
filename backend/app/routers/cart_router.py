from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.schemas.models import CartItemCreateRequest, CartItemUpdateRequest
from app.services.cart_order_service import cart_order_service

router = APIRouter(tags=["Cart"])


@router.get("/cart")
async def get_cart(user: Dict[str, Any] = Depends(require_customer)) -> Dict[str, Any]:
    return {"success": True, "data": cart_order_service.get_cart_summary(user["sub"])}


@router.post("/cart/items")
async def add_cart_item(
    payload: CartItemCreateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    summary = cart_order_service.add_to_cart(user["sub"], payload.product_id, payload.quantity)
    return {"success": True, "data": summary}


@router.patch("/cart/items/{item_id:path}")
async def update_cart_item(
    item_id: str,
    payload: CartItemUpdateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    summary = cart_order_service.update_cart_item(user["sub"], item_id, payload.quantity)
    return {"success": True, "data": summary}


@router.delete("/cart/items/{item_id:path}")
async def delete_cart_item(
    item_id: str,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    summary = cart_order_service.remove_from_cart(user["sub"], item_id)
    return {"success": True, "data": summary}

