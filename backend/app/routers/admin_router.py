from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from app.aws.cognito import cognito_idp
from app.aws.s3 import generate_presigned_image_upload
from app.dependencies.auth import require_admin
from app.repositories.inventory_repo import InventoryRepository
from app.schemas.models import (
    AdminCustomerStatusRequest,
    AdminOrderStatusUpdateRequest,
    AdminProductCreateRequest,
    AdminProductUpdateRequest,
    AdminStockAdjustRequest,
    PresignedUploadRequest,
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Admin Portal"])
inv_repo = InventoryRepository()


@router.get("/dashboard")
async def get_admin_dashboard(
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    return {"success": True, "data": admin_service.get_dashboard_metrics()}


@router.post("/products/upload-url")
async def create_presigned_upload_url(
    payload: PresignedUploadRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    url_data = generate_presigned_image_upload(
        filename=payload.filename,
        content_type=payload.content_type,
        file_size_bytes=payload.file_size_bytes,
    )
    return {"success": True, "data": url_data}


@router.post("/products", status_code=201)
async def create_product(
    payload: AdminProductCreateRequest,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    created = admin_service.create_product(payload.model_dump(), admin)
    return {"success": True, "data": created}


@router.patch("/products/{product_id:path}")
async def update_product(
    product_id: str,
    payload: AdminProductUpdateRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = admin_service.update_product(
        product_id, payload.model_dump(exclude_unset=True)
    )
    return {"success": True, "data": updated}


@router.delete("/products/{product_id:path}")
async def delete_product(
    product_id: str,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    res = admin_service.delete_or_deactivate_product(product_id)
    return {"success": True, "data": res}


@router.get("/orders")
async def list_admin_orders(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    orders = admin_service.list_orders(status_filter=status, search=search)
    return {"success": True, "data": orders}


@router.patch("/orders/{order_id:path}")
async def update_admin_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdateRequest,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = admin_service.update_order_status(
        order_id=order_id,
        new_status=payload.status,
        note=payload.note,
        admin_user=admin,
    )
    return {"success": True, "data": updated}


@router.get("/inventory")
async def get_admin_inventory(
    low_stock_only: bool = Query(default=False),
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    records = inv_repo.list_all_inventory(low_stock_only=low_stock_only)
    return {"success": True, "data": records}


@router.post("/inventory/{product_id}/adjust")
async def adjust_product_inventory(
    product_id: str,
    payload: AdminStockAdjustRequest,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = inv_repo.adjust_stock(
        product_id=product_id,
        delta=payload.delta,
        reason=payload.reason,
        actor=admin["name"],
        new_threshold=payload.low_stock_threshold,
    )
    return {"success": True, "data": updated}


@router.get("/customers")
async def list_admin_customers(
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    customers = admin_service.list_customers_with_stats()
    return {"success": True, "data": customers}


@router.patch("/customers/{user_id}/status")
async def update_customer_status(
    user_id: str,
    payload: AdminCustomerStatusRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = cognito_idp.update_user_status(user_id, payload.status)
    return {"success": True, "data": updated}

