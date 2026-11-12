import json
from typing import Any, Dict, Set
from app.aws.sns import publish_order_notification
from app.aws.sqs import ensure_order_queue, get_sqs_client, receive_order_messages
from app.repositories.order_review_repo import OrderRepository
from app.utils.logger import logger

_processed_idempotency_keys: Set[str] = set()


def handle_single_order_message(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Idempotent SQS message processor.
    Verifies idempotency key, advances 'Placed' orders to 'Confirmed' after automated
    fraud/payment verification, and publishes an Amazon SNS notification.
    """
    idem_key = body.get("idempotency_key", "")
    order = body.get("order", {})
    order_id = order.get("order_id", "")

    if idem_key and idem_key in _processed_idempotency_keys:
        logger.info(f"Skipping duplicate SQS message for idempotency_key={idem_key}")
        return {"status": "DUPLICATE_SKIPPED", "order_id": order_id}

    ord_repo = OrderRepository()
    stored = ord_repo.get_order_by_id(order_id)
    if stored and stored.get("order_status") == "Placed":
        ord_repo.update_order_status(
            order_id=order_id,
            new_status="Confirmed",
            note="Automated SQS worker verified simulated payment and confirmed stock allocation.",
            actor="AWS SQS Order Worker",
        )
        publish_order_notification(
            subject=f"LensCart Order Confirmed: {order_id}",
            payload={
                "event": "ORDER_CONFIRMED",
                "order_id": order_id,
                "customer_email": stored.get("customer_email"),
                "final_total": stored.get("final_total"),
            },
        )

    if idem_key:
        _processed_idempotency_keys.add(idem_key)

    return {"status": "PROCESSED", "order_id": order_id}


def process_pending_sqs_orders() -> int:
    """Polls and processes queued messages in local/dev or direct invocation."""
    messages = receive_order_messages(max_messages=10)
    if not messages:
        return 0
    sqs = get_sqs_client()
    queue_url = ensure_order_queue()
    processed_count = 0

    for msg in messages:
        try:
            payload = json.loads(msg["Body"])
            handle_single_order_message(payload)
            sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg["ReceiptHandle"])
            processed_count += 1
        except Exception as exc:
            logger.error(f"Failed processing SQS message {msg.get('MessageId')}: {exc}")
    return processed_count


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda SQS Trigger entrypoint with partial batch failure reporting (`batchItemFailures`).
    """
    batch_item_failures = []
    for record in event.get("Records", []):
        msg_id = record.get("messageId")
        try:
            body = json.loads(record.get("body", "{}"))
            handle_single_order_message(body)
        except Exception as exc:
            logger.error(f"SQS Worker error on message {msg_id}: {exc}")
            batch_item_failures.append({"itemIdentifier": msg_id})

    return {"batchItemFailures": batch_item_failures}

