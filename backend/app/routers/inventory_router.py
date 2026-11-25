from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from app.dependencies.auth import require_admin
from app.repositories.inventory_repo import InventoryRepository
from app.schemas.models import AdminStockAdjustRequest

router = APIRouter(prefix="/admin/inventory", tags=["Inventory Management"])
inv_repo = InventoryRepository()


@router.get("")
async def get_admin_inventory(
    low_stock_only: bool = Query(default=False),
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    records = inv_repo.list_all_inventory(low_stock_only=low_stock_only)
    return {"success": True, "data": records}


@router.post("/{product_id}/adjust")
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


@router.get("/{product_id}/logs")
async def get_product_inventory_logs(
    product_id: str,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    logs = inv_repo.get_logs_for_product(product_id)
    return {"success": True, "data": logs}
