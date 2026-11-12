from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from app.dependencies.auth import require_customer
from app.schemas.models import CompareProductsRequest, ReviewCreateRequest
from app.services.catalog_service import catalog_service

router = APIRouter(tags=["Products, Categories & Reviews"])


@router.get("/categories")
async def list_categories() -> Dict[str, Any]:
    return {"success": True, "data": catalog_service.list_categories()}


@router.get("/categories/{category_id:path}")
async def get_category(category_id: str) -> Dict[str, Any]:
    return {"success": True, "data": catalog_service.get_category_detail(category_id)}


@router.get("/products")
async def list_products(
    q: Optional[str] = Query(default=None),
    category_id: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    min_rating: Optional[float] = Query(default=None, ge=0, le=5),
    lens_mount: Optional[str] = Query(default=None),
    in_stock_only: bool = Query(default=False),
    featured: Optional[bool] = Query(default=None),
    is_new_arrival: Optional[bool] = Query(default=None),
    is_best_seller: Optional[bool] = Query(default=None),
    on_sale: Optional[bool] = Query(default=None),
    sort_by: str = Query(default="popularity"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
) -> Dict[str, Any]:
    result = catalog_service.query_products(
        q=q,
        category_id=category_id,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        lens_mount=lens_mount,
        in_stock_only=in_stock_only,
        featured=featured,
        is_new_arrival=is_new_arrival,
        is_best_seller=is_best_seller,
        on_sale=on_sale,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return {"success": True, "data": result["items"], "meta": result["meta"]}


@router.post("/products/compare")
async def compare_products(payload: CompareProductsRequest) -> Dict[str, Any]:
    data = catalog_service.compare_products(payload.product_ids)
    return {"success": True, "data": data}


@router.get("/products/{product_id}/compatibility")
async def get_product_compatibility(product_id: str) -> Dict[str, Any]:
    data = catalog_service.check_mount_compatibility(product_id)
    return {"success": True, "data": data}


@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str) -> Dict[str, Any]:
    reviews = catalog_service.list_reviews(product_id)
    return {"success": True, "data": reviews}


@router.post("/products/{product_id}/reviews", status_code=201)
async def create_product_review(
    product_id: str,
    payload: ReviewCreateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    review = catalog_service.add_review(
        product_id=product_id,
        user_sub=user["sub"],
        user_name=user["name"],
        rating=payload.rating,
        title=payload.title,
        comment=payload.comment,
    )
    return {"success": True, "data": review}


@router.get("/products/{product_id:path}")
async def get_product_detail(product_id: str) -> Dict[str, Any]:
    data = catalog_service.get_product_detail(product_id)
    return {"success": True, "data": data}

