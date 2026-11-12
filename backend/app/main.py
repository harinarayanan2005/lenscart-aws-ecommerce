from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.security import (
    SecurityAndSizeLimitMiddleware,
    register_exception_handlers,
)
from app.routers import admin_router, auth_router, cart_order_router, catalog_router
from scripts.seed_data import seed_initial_data


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_initial_data()
    yield


def create_app() -> FastAPI:
    seed_initial_data()
    app = FastAPI(
        title="LensCart Photography Equipment Store API",
        description="Serverless FastAPI Backend powered by AWS Lambda Function URLs, DynamoDB, Cognito, S3, SQS, SNS & EventBridge",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
            },
        }

    app.include_router(auth_router.router)
    app.include_router(catalog_router.router)
    app.include_router(cart_order_router.router)
    app.include_router(admin_router.router)

    return app


app = create_app()

