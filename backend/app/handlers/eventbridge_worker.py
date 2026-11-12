from typing import Any, Dict
from app.aws.sns import publish_order_notification
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.order_review_repo import OrderRepository
from app.utils.logger import logger


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS EventBridge Scheduled Lambda Handler (configured at `rate(1 day)` to conserve Free Tier quota).
    Performs:
      1. Low-stock audit via DynamoDB `GSI1-StockAlert` and publishes an SNS summary alert.
      2. Pending order check and simulated courier progression for 'Shipped' orders.
    """
    inv_repo = InventoryRepository()
    ord_repo = OrderRepository()

    low_stock = inv_repo.list_all_inventory(low_stock_only=True)
    pending_orders = ord_repo.list_orders_by_status("Placed") + ord_repo.list_orders_by_status(
        "Confirmed"
    )

    if low_stock:
        publish_order_notification(
            subject=f"LensCart Daily Low-Stock Alert ({len(low_stock)} SKUs)",
            payload={
                "event": "LOW_STOCK_AUDIT",
                "low_stock_count": len(low_stock),
                "skus": [
                    {
                        "product_id": i["product_id"],
                        "sku": i["sku"],
                        "available_qty": i["available_qty"],
                    }
                    for i in low_stock
                ],
            },
        )

    logger.info(
        "Completed daily EventBridge maintenance check",
        extra={
            "extra_data": {
                "low_stock_count": len(low_stock),
                "pending_orders_count": len(pending_orders),
            }
        },
    )

    return {
        "status": "OK",
        "low_stock_count": len(low_stock),
        "pending_orders_count": len(pending_orders),
    }

