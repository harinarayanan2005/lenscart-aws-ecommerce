from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.schemas.models import WishlistAddRequest
from app.services.cart_order_service import cart_order_service

router = APIRouter(tags=["Wishlist"])


@router.get("/wishlist")
async def get_wishlist(user: Dict[str, Any] = Depends(require_customer)) -> Dict[str, Any]:
    return {"success": True, "data": cart_order_service.get_wishlist(user["sub"])}


@router.post("/wishlist")
async def add_to_wishlist(
    payload: WishlistAddRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    items = cart_order_service.add_to_wishlist(user["sub"], payload.product_id)
    return {"success": True, "data": items}


@router.delete("/wishlist/{product_id:path}")
async def remove_from_wishlist(
    product_id: str,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    items = cart_order_service.remove_from_wishlist(user["sub"], product_id)
    return {"success": True, "data": items}

