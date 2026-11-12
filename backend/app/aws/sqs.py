import json
from typing import Any, Dict, List
import boto3
from app.aws.dynamodb import ensure_local_aws_mock
from app.config import settings
from app.utils.logger import logger

_queue_url_cache: str | None = None


def get_sqs_client():
    ensure_local_aws_mock()
    return boto3.client("sqs", region_name=settings.AWS_REGION)


def ensure_order_queue() -> str:
    """Ensures the SQS Order Processing Queue (with 20s Long Polling for Free Tier efficiency) exists."""
    global _queue_url_cache
    if _queue_url_cache:
        return _queue_url_cache

    sqs = get_sqs_client()
    queue_name = f"{settings.TABLE_PREFIX}-order-queue"
    resp = sqs.create_queue(
        QueueName=queue_name,
        Attributes={
            "ReceiveMessageWaitTimeSeconds": "20",  # Long polling to minimize SQS API requests
            "VisibilityTimeout": "60",
        },
    )
    _queue_url_cache = resp["QueueUrl"]
    return _queue_url_cache


def enqueue_order_event(event_type: str, order_payload: Dict[str, Any], idempotency_key: str) -> str:
    """Publishes an asynchronous order-processing message to Amazon SQS."""
    sqs = get_sqs_client()
    queue_url = ensure_order_queue()
    body = {
        "event_type": event_type,
        "idempotency_key": idempotency_key,
        "order": order_payload,
    }
    resp = sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(body, default=str),
        MessageAttributes={
            "EventType": {"DataType": "String", "StringValue": event_type},
            "IdempotencyKey": {"DataType": "String", "StringValue": idempotency_key},
        },
    )
    msg_id = resp.get("MessageId", "")
    logger.info(
        f"Enqueued SQS order event {event_type} for {order_payload.get('order_id')}",
        extra={"extra_data": {"message_id": msg_id, "event_type": event_type}},
    )
    return msg_id


def receive_order_messages(max_messages: int = 5) -> List[Dict[str, Any]]:
    sqs = get_sqs_client()
    queue_url = ensure_order_queue()
    resp = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=0 if settings.USE_LOCAL_AWS else 20,
        MessageAttributeNames=["All"],
    )
    return resp.get("Messages", [])

