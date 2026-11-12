from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.schemas.models import (
    CartItemCreateRequest,
    CartItemUpdateRequest,
    OrderCancelRequest,
    OrderCreateRequest,
    WishlistAddRequest,
)
from app.services.cart_order_service import cart_order_service

router = APIRouter(tags=["Cart, Wishlist & Orders"])


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


@router.post("/orders", status_code=201)
async def create_order(
    payload: OrderCreateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    order = cart_order_service.place_order(
        user=user,
        address_id=payload.address_id,
        payment_method=payload.payment_method,
        idempotency_key=payload.idempotency_key,
    )
    return {"success": True, "data": order}


@router.get("/orders")
async def list_my_orders(user: Dict[str, Any] = Depends(require_customer)) -> Dict[str, Any]:
    orders = cart_order_service.get_customer_orders(user["sub"])
    return {"success": True, "data": orders}


@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    payload: OrderCancelRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    updated = cart_order_service.cancel_order(user, order_id, payload.reason)
    return {"success": True, "data": updated}


@router.get("/orders/{order_id}")
async def get_order_detail(
    order_id: str,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    order = cart_order_service.get_customer_order_detail(user, order_id)
    return {"success": True, "data": order}

