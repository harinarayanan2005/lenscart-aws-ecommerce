from datetime import datetime, timezone
from typing import Dict, Optional
import boto3
from app.aws.dynamodb import ensure_local_aws_mock
from app.config import settings
from app.utils.logger import logger


def get_cloudwatch_client():
    ensure_local_aws_mock()
    return boto3.client("cloudwatch", region_name=settings.AWS_REGION)


def emit_metric(
    metric_name: str,
    value: float = 1.0,
    unit: str = "Count",
    dimensions: Optional[Dict[str, str]] = None,
) -> None:
    """
    Logs a structured CloudWatch Embedded Metric Format (EMF) event to stdout
    (zero extra PutMetricData API cost on AWS Free Tier) and records structured telemetry.
    """
    dim_map = {"Environment": settings.APP_ENV, **(dimensions or {})}
    logger.info(
        f"CloudWatch Metric: {metric_name}={value} {unit}",
        extra={
            "extra_data": {
                "namespace": settings.CLOUDWATCH_NAMESPACE,
                "metric_name": metric_name,
                "value": value,
                "unit": unit,
                "dimensions": dim_map,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

