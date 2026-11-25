from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.schemas.models import OrderCancelRequest, OrderCreateRequest
from app.services.cart_order_service import cart_order_service

router = APIRouter(tags=["Orders"])


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

