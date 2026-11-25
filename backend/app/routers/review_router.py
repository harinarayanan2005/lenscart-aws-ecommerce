from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_customer
from app.schemas.models import ReviewCreateRequest
from app.services.catalog_service import catalog_service

router = APIRouter(tags=["Reviews"])


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

