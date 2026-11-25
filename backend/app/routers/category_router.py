from typing import Any, Dict
from fastapi import APIRouter
from app.services.catalog_service import catalog_service

router = APIRouter(tags=["Categories"])


@router.get("/categories")
async def list_categories() -> Dict[str, Any]:
    return {"success": True, "data": catalog_service.list_categories()}


@router.get("/categories/{category_id:path}")
async def get_category(category_id: str) -> Dict[str, Any]:
    return {"success": True, "data": catalog_service.get_category_detail(category_id)}

