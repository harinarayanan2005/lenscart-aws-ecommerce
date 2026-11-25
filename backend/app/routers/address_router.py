from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.repositories.customer_repo import AddressRepository
from app.schemas.models import AddressCreateRequest

router = APIRouter(tags=["Addresses"])
addr_repo = AddressRepository()


@router.get("/profile/addresses")
async def list_my_addresses(user: Dict[str, Any] = Depends(require_customer)) -> Dict[str, Any]:
    addresses = addr_repo.list_addresses(user["sub"])
    return {"success": True, "data": addresses}


@router.post("/profile/addresses", status_code=201)
async def create_my_address(
    payload: AddressCreateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    created = addr_repo.create_address(user["sub"], payload.model_dump())
    return {"success": True, "data": created}


@router.delete("/profile/addresses/{address_id}")
async def delete_my_address(
    address_id: str,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    deleted = addr_repo.delete_address(user["sub"], address_id)
    return {"success": True, "data": {"deleted": deleted}}

