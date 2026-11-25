import json
from typing import Any, Dict
import boto3
from app.aws.dynamodb import ensure_local_aws_mock
from app.config import settings
from app.utils.logger import logger

_topic_arn_cache: str | None = None


def get_sns_client():
    ensure_local_aws_mock()
    return boto3.client("sns", region_name=settings.AWS_REGION)


def ensure_order_topic() -> str:
    global _topic_arn_cache
    if not settings.USE_LOCAL_AWS and settings.effective_sns_topic_arn:
        return settings.effective_sns_topic_arn
    if _topic_arn_cache:
        return _topic_arn_cache
    sns = get_sns_client()
    topic_name = f"{settings.TABLE_PREFIX}-order-events"
    resp = sns.create_topic(Name=topic_name)
    _topic_arn_cache = resp["TopicArn"]
    return _topic_arn_cache


def publish_order_notification(subject: str, payload: Dict[str, Any]) -> str:
    """Publishes an order update or low-stock alert to Amazon SNS."""
    if not settings.USE_LOCAL_AWS and not settings.effective_sns_topic_arn:
        logger.info(f"SNS topic not configured; skipping SNS publish for '{subject}'.")
        return ""
    sns = get_sns_client()
    topic_arn = ensure_order_topic()
    resp = sns.publish(
        TopicArn=topic_arn,
        Subject=subject[:100],
        Message=json.dumps(payload, default=str),
    )
    msg_id = resp.get("MessageId", "")
    logger.info(
        f"Published SNS notification: {subject}",
        extra={"extra_data": {"sns_message_id": msg_id, "topic_arn": topic_arn}},
    )
    return msg_id
