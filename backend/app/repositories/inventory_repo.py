import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import status
from app.aws.dynamodb import get_table
from app.middleware.security import AppError
from app.utils.pricing import decimal_to_native, float_to_decimal


class InventoryRepository:
    """
    DynamoDB Repository for Inventory (`lenscart-inventory`).
    Supports real-time stock checks, conditional atomic stock updates,
    GSI1 low-stock queries, and audit log history (`SK = LOG#<timestamp>#<id>`).
    """

    @staticmethod
    def _compute_alert_status(available_qty: int, threshold: int) -> str:
        if available_qty <= 0:
            return "OUT_OF_STOCK"
        if available_qty <= threshold:
            return "LOW_STOCK"
        return "OK"

    def put_stock_record(
        self,
        product_id: str,
        sku: str,
        product_name: str,
        brand: str,
        category_name: str,
        available_qty: int,
        reserved_qty: int = 0,
        low_stock_threshold: int = 5,
    ) -> Dict[str, Any]:
        table = get_table("inventory")
        now = datetime.now(timezone.utc).isoformat()
        alert_status = self._compute_alert_status(available_qty, low_stock_threshold)
        record = {
            "product_id": product_id,
            "record_type": "STOCK",
            "sku": sku,
            "product_name": product_name,
            "brand": brand,
            "category_name": category_name,
            "available_qty": int(available_qty),
            "reserved_qty": int(reserved_qty),
            "low_stock_threshold": int(low_stock_threshold),
            "stock_alert_status": alert_status,
            "qty_sort_key": f"{max(0, int(available_qty)):06d}#{product_id}",
            "updated_at": now,
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)

    def get_stock(self, product_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("inventory")
        resp = table.get_item(Key={"product_id": product_id, "record_type": "STOCK"})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def get_logs_for_product(self, product_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        table = get_table("inventory")
        resp = table.query(
            KeyConditionExpression=Key("product_id").eq(product_id)
            & Key("record_type").begins_with("LOG#"),
            ScanIndexForward=False,
            Limit=limit,
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def append_stock_log(
        self,
        product_id: str,
        delta: int,
        previous_qty: int,
        new_qty: int,
        reason: str,
        actor: str,
    ) -> Dict[str, Any]:
        table = get_table("inventory")
        now = datetime.now(timezone.utc).isoformat()
        log_id = f"log-{uuid.uuid4().hex[:8]}"
        entry = {
            "product_id": product_id,
            "record_type": f"LOG#{now}#{log_id}",
            "log_id": log_id,
            "delta": delta,
            "previous_qty": previous_qty,
            "new_qty": new_qty,
            "reason": reason,
            "actor": actor,
            "timestamp": now,
        }
        table.put_item(Item=float_to_decimal(entry))
        return decimal_to_native(entry)

    def adjust_stock(
        self,
        product_id: str,
        delta: int,
        reason: str,
        actor: str,
        new_threshold: Optional[int] = None,
    ) -> Dict[str, Any]:
        current = self.get_stock(product_id)
        if not current:
            raise AppError(
                "INVENTORY_NOT_FOUND",
                f"Inventory record for product '{product_id}' not found.",
                status.HTTP_404_NOT_FOUND,
            )
        prev_qty = int(current["available_qty"])
        new_qty = prev_qty + int(delta)
        if new_qty < 0:
            raise AppError(
                "INSUFFICIENT_STOCK",
                f"Cannot reduce stock below zero (current: {prev_qty}, delta: {delta}).",
                status.HTTP_409_CONFLICT,
            )
        threshold = int(
            new_threshold if new_threshold is not None else current.get("low_stock_threshold", 5)
        )
        updated = self.put_stock_record(
            product_id=product_id,
            sku=current["sku"],
            product_name=current["product_name"],
            brand=current["brand"],
            category_name=current["category_name"],
            available_qty=new_qty,
            reserved_qty=int(current.get("reserved_qty", 0)),
            low_stock_threshold=threshold,
        )
        self.append_stock_log(
            product_id=product_id,
            delta=delta,
            previous_qty=prev_qty,
            new_qty=new_qty,
            reason=reason,
            actor=actor,
        )
        updated["recent_logs"] = self.get_logs_for_product(product_id, limit=10)
        return updated

    def reserve_stock_conditional(self, product_id: str, quantity: int, order_id: str, actor: str) -> None:
        """
        Atomically decrements available_qty and increments reserved_qty using a
        DynamoDB ConditionExpression (`available_qty >= :qty`) to prevent overselling.
        """
        table = get_table("inventory")
        current = self.get_stock(product_id)
        if not current:
            raise AppError("INVENTORY_NOT_FOUND", f"Stock record missing for {product_id}", status.HTTP_404_NOT_FOUND)

        prev_qty = int(current["available_qty"])
        new_qty = prev_qty - quantity
        threshold = int(current.get("low_stock_threshold", 5))
        new_status = self._compute_alert_status(new_qty, threshold)
        now = datetime.now(timezone.utc).isoformat()

        try:
            table.update_item(
                Key={"product_id": product_id, "record_type": "STOCK"},
                UpdateExpression=(
                    "SET available_qty = available_qty - :q, "
                    "reserved_qty = reserved_qty + :q, "
                    "stock_alert_status = :status, "
                    "qty_sort_key = :qsk, "
                    "updated_at = :now"
                ),
                ConditionExpression="available_qty >= :q",
                ExpressionAttributeValues={
                    ":q": quantity,
                    ":status": new_status,
                    ":qsk": f"{max(0, new_qty):06d}#{product_id}",
                    ":now": now,
                },
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise AppError(
                    "INSUFFICIENT_STOCK",
                    f"Insufficient stock for {current.get('product_name', product_id)}.",
                    status.HTTP_409_CONFLICT,
                    details={"product_id": product_id, "available": prev_qty, "requested": quantity},
                )
            raise

        self.append_stock_log(
            product_id=product_id,
            delta=-quantity,
            previous_qty=prev_qty,
            new_qty=new_qty,
            reason=f"Order Reserved ({order_id})",
            actor=actor,
        )

    def release_reserved_stock(self, product_id: str, quantity: int, order_id: str, actor: str) -> None:
        current = self.get_stock(product_id)
        if not current:
            return
        prev_qty = int(current["available_qty"])
        new_qty = prev_qty + quantity
        prev_res = int(current.get("reserved_qty", 0))
        new_res = max(0, prev_res - quantity)
        threshold = int(current.get("low_stock_threshold", 5))
        self.put_stock_record(
            product_id=product_id,
            sku=current["sku"],
            product_name=current["product_name"],
            brand=current["brand"],
            category_name=current["category_name"],
            available_qty=new_qty,
            reserved_qty=new_res,
            low_stock_threshold=threshold,
        )
        self.append_stock_log(
            product_id=product_id,
            delta=quantity,
            previous_qty=prev_qty,
            new_qty=new_qty,
            reason=f"Order Cancelled Restock ({order_id})",
            actor=actor,
        )

    def query_by_alert_status(self, status_value: str) -> List[Dict[str, Any]]:
        table = get_table("inventory")
        resp = table.query(
            IndexName="GSI1-StockAlert",
            KeyConditionExpression=Key("stock_alert_status").eq(status_value),
        )
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def list_all_inventory(self, low_stock_only: bool = False) -> List[Dict[str, Any]]:
        low_items = self.query_by_alert_status("LOW_STOCK") + self.query_by_alert_status(
            "OUT_OF_STOCK"
        )
        if low_stock_only:
            items = low_items
        else:
            items = low_items + self.query_by_alert_status("OK")
        for item in items:
            item["recent_logs"] = self.get_logs_for_product(item["product_id"], limit=6)
        items.sort(key=lambda x: x["available_qty"])
        return items

