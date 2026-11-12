import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from app.aws.dynamodb import get_table
from app.utils.pricing import decimal_to_native, float_to_decimal


class OrderRepository:
    """
    DynamoDB Repository for Orders (`lenscart-orders`).
    Uses GSI1 (`user_id` + `created_sort_key`), GSI2 (`order_status` + `created_sort_key`),
    and GSI3 (`all_orders_partition` + `created_sort_key`). Zero table scans.
    """

    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        table = get_table("orders")
        now = order_data.get("created_at") or datetime.now(timezone.utc).isoformat()
        order_id = order_data["order_id"]
        record = {
            **order_data,
            "record_type": "META",
            "all_orders_partition": "ALL_ORDERS",
            "created_sort_key": f"{now}#{order_id}",
            "created_at": now,
            "updated_at": now,
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)

    def get_order_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("orders")
        resp = table.get_item(Key={"order_id": order_id, "record_type": "META"})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def list_orders_for_user(self, user_sub: str) -> List[Dict[str, Any]]:
        table = get_table("orders")
        resp = table.query(
            IndexName="GSI1-UserOrders",
            KeyConditionExpression=Key("user_id").eq(f"USER#{user_sub}"),
            ScanIndexForward=False,
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def list_orders_by_status(self, status_val: str) -> List[Dict[str, Any]]:
        table = get_table("orders")
        resp = table.query(
            IndexName="GSI2-StatusOrders",
            KeyConditionExpression=Key("order_status").eq(status_val),
            ScanIndexForward=False,
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def list_all_orders(self) -> List[Dict[str, Any]]:
        table = get_table("orders")
        resp = table.query(
            IndexName="GSI3-AllOrders",
            KeyConditionExpression=Key("all_orders_partition").eq("ALL_ORDERS"),
            ScanIndexForward=False,
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def update_order_status(
        self,
        order_id: str,
        new_status: str,
        note: str,
        actor: str,
        payment_status: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        existing = self.get_order_by_id(order_id)
        if not existing:
            return None
        now = datetime.now(timezone.utc).isoformat()
        timeline = list(existing.get("timeline", []))
        timeline.append(
            {
                "status": new_status,
                "timestamp": now,
                "note": note,
                "actor": actor,
            }
        )
        existing["order_status"] = new_status
        existing["timeline"] = timeline
        existing["updated_at"] = now
        if payment_status:
            existing["payment_status"] = payment_status

        table = get_table("orders")
        table.put_item(Item=float_to_decimal(existing))
        return decimal_to_native(existing)


class ReviewRepository:
    """
    DynamoDB Repository for Product Reviews (`lenscart-reviews`).
    Queries by `product_id` and `GSI1-UserReviews`. Zero table scans.
    """

    def list_for_product(self, product_id: str) -> List[Dict[str, Any]]:
        table = get_table("reviews")
        resp = table.query(
            KeyConditionExpression=Key("product_id").eq(product_id),
            ScanIndexForward=False,
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def create_review(
        self,
        product_id: str,
        user_sub: str,
        user_name: str,
        rating: int,
        title: str,
        comment: str,
        verified_purchase: bool = True,
    ) -> Dict[str, Any]:
        table = get_table("reviews")
        now = datetime.now(timezone.utc).isoformat()
        review_id = f"rev-{uuid.uuid4().hex[:10]}"
        record = {
            "product_id": product_id,
            "review_sort": f"REV#{now}#{user_sub}",
            "review_id": review_id,
            "user_id": f"USER#{user_sub}",
            "user_name": user_name,
            "rating": int(rating),
            "title": title.strip(),
            "comment": comment.strip(),
            "verified_purchase": verified_purchase,
            "created_at": now,
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)


category_repo = None
product_repo = None
inventory_repo = None
cart_repo = None
wishlist_repo = None
address_repo = None
order_repo = OrderRepository()
review_repo = ReviewRepository()

