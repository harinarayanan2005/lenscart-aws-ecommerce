from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRODUCT_MEDIA_ROOT = PROJECT_ROOT / "product_media"


class Settings(BaseSettings):
    APP_NAME: str = "LensCart Serverless API"
    APP_ENV: str = "development"
    AWS_REGION: str = "ap-south-1"

    # When USE_LOCAL_AWS=True, the backend uses in-process Moto emulation for
    # DynamoDB, S3, SQS, and SNS so offline local development and automated pytest
    # suites run without requiring live AWS credentials.
    # When USE_LOCAL_AWS=False (Production Lambda), all operations use live AWS services.
    USE_LOCAL_AWS: bool = True
    DYNAMODB_ENDPOINT_URL: str = ""
    TABLE_PREFIX: str = "lenscart"

    # Optional explicit DynamoDB table name overrides
    DYNAMODB_PRODUCTS_TABLE: str = ""
    DYNAMODB_CATEGORIES_TABLE: str = ""
    DYNAMODB_INVENTORY_TABLE: str = ""
    DYNAMODB_CARTS_TABLE: str = ""
    DYNAMODB_WISHLISTS_TABLE: str = ""
    DYNAMODB_ADDRESSES_TABLE: str = ""
    DYNAMODB_ORDERS_TABLE: str = ""
    DYNAMODB_REVIEWS_TABLE: str = ""

    # Amazon Cognito configuration
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_CLIENT_ID: str = ""
    JWT_SECRET_KEY: str = "lenscart-local-dev-only-jwt-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # Amazon S3 & CloudFront Media Delivery
    S3_MEDIA_BUCKET: str = "lenscart-product-media-private"
    S3_FRONTEND_BUCKET: str = "lenscart-frontend-assets"
    CLOUDFRONT_MEDIA_DOMAIN: str = ""
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB strict cap
    MAX_REQUEST_BODY_BYTES: int = 1 * 1024 * 1024  # 1 MB JSON request body limit

    # Amazon SQS & SNS
    SQS_ORDER_QUEUE_URL: str = ""
    SNS_TOPIC_ARN: str = ""
    SNS_ORDER_TOPIC_ARN: str = ""

    # CloudWatch
    CLOUDWATCH_NAMESPACE: str = "LensCart/Application"

    # CORS Origins
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN.strip() not in origins:
            origins.append(self.FRONTEND_ORIGIN.strip())
        return origins

    @property
    def effective_sns_topic_arn(self) -> str:
        return self.SNS_TOPIC_ARN or self.SNS_ORDER_TOPIC_ARN

    @property
    def cognito_issuer(self) -> str:
        pool_id = self.COGNITO_USER_POOL_ID or f"{self.AWS_REGION}_LensCartPool"
        return f"https://cognito-idp.{self.AWS_REGION}.amazonaws.com/{pool_id}"

    @property
    def cognito_jwks_url(self) -> str:
        return f"{self.cognito_issuer}/.well-known/jwks.json"

    def table_name(self, entity: str) -> str:
        explicit_map = {
            "products": self.DYNAMODB_PRODUCTS_TABLE,
            "categories": self.DYNAMODB_CATEGORIES_TABLE,
            "inventory": self.DYNAMODB_INVENTORY_TABLE,
            "carts": self.DYNAMODB_CARTS_TABLE,
            "wishlists": self.DYNAMODB_WISHLISTS_TABLE,
            "addresses": self.DYNAMODB_ADDRESSES_TABLE,
            "orders": self.DYNAMODB_ORDERS_TABLE,
            "reviews": self.DYNAMODB_REVIEWS_TABLE,
        }
        override = explicit_map.get(entity, "")
        if override:
            return override
        return f"{self.TABLE_PREFIX}-{entity}"


settings = Settings()
