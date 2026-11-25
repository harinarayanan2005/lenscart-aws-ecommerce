from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.aws.s3 import get_s3_client
from app.config import PRODUCT_MEDIA_ROOT, PROJECT_ROOT, settings
from app.middleware.security import (
    SecurityAndSizeLimitMiddleware,
    register_exception_handlers,
)
from app.routers import (
    address_router,
    admin_router,
    auth_router,
    cart_router,
    category_router,
    inventory_router,
    order_router,
    product_router,
    review_router,
    wishlist_router,
)
from scripts.seed_data import seed_initial_data


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.USE_LOCAL_AWS:
        seed_initial_data()
    yield


def create_app() -> FastAPI:
    if settings.USE_LOCAL_AWS:
        seed_initial_data()

    app = FastAPI(
        title="LensCart Photography Equipment Store API",
        description="Serverless FastAPI Backend powered by AWS Lambda Function URLs, DynamoDB, Cognito, S3, CloudFront OAC, SQS, SNS & EventBridge",
        version="2.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
    )
    app.add_middleware(SecurityAndSizeLimitMiddleware)

    register_exception_handlers(app)

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "success": True,
            "data": {
                "service": "lenscart-api",
                "status": "healthy",
                "environment": settings.APP_ENV,
                "aws_region": settings.AWS_REGION,
                "local_aws_emulation": settings.USE_LOCAL_AWS,
            },
        }

    @app.get("/media/{object_key:path}", tags=["Product Media"])
    async def serve_product_media(object_key: str):
        """
        Serves product media files locally when USE_LOCAL_AWS=True, or from S3 Moto bucket
        for uploaded product images. In AWS production, images are delivered via CloudFront OAC
        or S3 Presigned GET URLs.
        """
        clean_key = object_key.lstrip("/")
        if ".." in clean_key:
            return Response(status_code=400, content="Invalid media key")

        candidate_paths = [
            PROJECT_ROOT / clean_key,
            PRODUCT_MEDIA_ROOT / clean_key.removeprefix("product_media/"),
        ]
        # Prefer high-resolution .jpg photograph when available alongside .svg
        if clean_key.endswith(".svg"):
            jpg_key = clean_key[:-4] + ".jpg"
            candidate_paths = [
                PROJECT_ROOT / jpg_key,
                PRODUCT_MEDIA_ROOT / jpg_key.removeprefix("product_media/"),
                *candidate_paths,
            ]
        for candidate in candidate_paths:
            if candidate.is_file():
                suffix = candidate.suffix.lower()
                mime = {
                    ".svg": "image/svg+xml",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                }.get(suffix, "application/octet-stream")
                return Response(
                    content=candidate.read_bytes(),
                    media_type=mime,
                    headers={"Cache-Control": "public, max-age=86400"},
                )

        # Fallback: check S3 bucket (e.g., images uploaded via presigned PUT in Moto)
        try:
            s3 = get_s3_client()
            obj = s3.get_object(Bucket=settings.S3_MEDIA_BUCKET, Key=clean_key)
            return Response(
                content=obj["Body"].read(),
                media_type=obj.get("ContentType", "image/svg+xml"),
            )
        except Exception:
            fallback_svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">'
                '<rect width="800" height="600" fill="#14171c"/>'
                '<circle cx="400" cy="280" r="85" fill="none" stroke="#c89d54" stroke-width="4"/>'
                '<circle cx="400" cy="280" r="42" fill="#1f242d" stroke="#c89d54" stroke-width="2"/>'
                '<text x="400" y="430" text-anchor="middle" fill="#f4f6f8" font-family="sans-serif" font-size="22" font-weight="600">LENSCART STUDIO OPTICAL</text>'
                "</svg>"
            )
            return Response(content=fallback_svg, media_type="image/svg+xml")

    # Register all 10 modular domain routers (review_router before product_router so
    # /products/{product_id}/reviews matches before /products/{product_id:path})
    app.include_router(auth_router.router)
    app.include_router(category_router.router)
    app.include_router(review_router.router)
    app.include_router(product_router.router)
    app.include_router(cart_router.router)
    app.include_router(wishlist_router.router)
    app.include_router(order_router.router)
    app.include_router(address_router.router)
    app.include_router(inventory_router.router)
    app.include_router(admin_router.router)

    return app


app = create_app()
