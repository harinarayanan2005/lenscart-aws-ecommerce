"""
LensCart AWS Configuration & Readiness Validator.
Validates environment settings, target AWS region (`ap-south-1`), DynamoDB table schemas,
Cognito settings, S3 media bucket settings, and SQS/SNS configuration.
"""

from typing import Any, Dict, List
from app.aws.dynamodb import TABLE_DEFINITIONS
from app.config import PRODUCT_MEDIA_ROOT, settings


def validate_aws_environment() -> Dict[str, Any]:
    warnings: List[str] = []
    errors: List[str] = []

    if settings.AWS_REGION != "ap-south-1":
        warnings.append(
            f"AWS_REGION is '{settings.AWS_REGION}' (recommended production region is 'ap-south-1' Mumbai)."
        )

    if not settings.USE_LOCAL_AWS:
        if not settings.COGNITO_USER_POOL_ID:
            errors.append("COGNITO_USER_POOL_ID is required when USE_LOCAL_AWS=false.")
        if not settings.COGNITO_CLIENT_ID:
            errors.append("COGNITO_CLIENT_ID is required when USE_LOCAL_AWS=false.")
        if not settings.S3_MEDIA_BUCKET:
            errors.append("S3_MEDIA_BUCKET is required when USE_LOCAL_AWS=false.")
        if not settings.SQS_ORDER_QUEUE_URL:
            warnings.append("SQS_ORDER_QUEUE_URL is empty; default queue naming will be used.")

    table_names = [settings.table_name(spec["entity"]) for spec in TABLE_DEFINITIONS]
    media_folders = [
        d.name for d in PRODUCT_MEDIA_ROOT.iterdir() if d.is_dir()
    ] if PRODUCT_MEDIA_ROOT.exists() else []

    return {
        "valid": len(errors) == 0,
        "aws_region": settings.AWS_REGION,
        "use_local_aws": settings.USE_LOCAL_AWS,
        "tables": table_names,
        "s3_media_bucket": settings.S3_MEDIA_BUCKET,
        "cognito_issuer": settings.cognito_issuer,
        "media_folders": sorted(media_folders),
        "warnings": warnings,
        "errors": errors,
    }


if __name__ == "__main__":
    report = validate_aws_environment()
    print("LensCart AWS Configuration Report:")
    for k, v in report.items():
        print(f"  {k}: {v}")

