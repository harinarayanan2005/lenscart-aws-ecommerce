from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "LensCart Serverless API"
    APP_ENV: str = "development"
    AWS_REGION: str = "us-east-1"

    # When USE_LOCAL_AWS=True, the backend uses an in-process Moto DynamoDB/S3/SQS/SNS
    # emulation layer (or DYNAMODB_ENDPOINT_URL if provided) so all boto3 operations,
    # GSIs, ConditionExpressions, and TransactWriteItems execute authentically offline.
    USE_LOCAL_AWS: bool = True
    DYNAMODB_ENDPOINT_URL: str = ""
    TABLE_PREFIX: str = "lenscart"

    COGNITO_USER_POOL_ID: str = "us-east-1_LensCartPool"
    COGNITO_CLIENT_ID: str = "lenscart-web-client"
    JWT_SECRET_KEY: str = "lenscart-dev-cognito-compatible-jwt-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    S3_MEDIA_BUCKET: str = "lenscart-product-media-private"
    S3_FRONTEND_BUCKET: str = "lenscart-frontend-assets"
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB strict cap
    MAX_REQUEST_BODY_BYTES: int = 1 * 1024 * 1024  # 1 MB JSON request body limit

    SQS_ORDER_QUEUE_URL: str = "https://sqs.us-east-1.amazonaws.com/123456789012/lenscart-order-queue"
    SNS_ORDER_TOPIC_ARN: str = "arn:aws:sns:us-east-1:123456789012:lenscart-order-events"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def table_name(self, entity: str) -> str:
        return f"{self.TABLE_PREFIX}-{entity}"


settings = Settings()

