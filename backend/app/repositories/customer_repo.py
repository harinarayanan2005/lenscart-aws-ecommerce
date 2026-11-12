import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from app.aws.dynamodb import get_table
from app.utils.pricing import decimal_to_native, float_to_decimal


class CartRepository:
    """
    DynamoDB Repository for Customer Shopping Carts (`lenscart-carts`).
    Strictly isolated by partition key `PK = USER#<cognito_sub>`.
    """

    @staticmethod
    def _pk(user_sub: str) -> str:
        return f"USER#{user_sub}"

    def list_items(self, user_sub: str) -> List[Dict[str, Any]]:
        table = get_table("carts")
        resp = table.query(KeyConditionExpression=Key("user_id").eq(self._pk(user_sub)))
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def get_item(self, user_sub: str, item_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("carts")
        resp = table.get_item(Key={"user_id": self._pk(user_sub), "item_id": item_id})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def upsert_item(self, user_sub: str, product_id: str, quantity: int) -> Dict[str, Any]:
        table = get_table("carts")
        item_id = f"ITEM#{product_id}"
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "user_id": self._pk(user_sub),
            "item_id": item_id,
            "product_id": product_id,
            "quantity": int(quantity),
            "updated_at": now,
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)

    def remove_item(self, user_sub: str, item_id: str) -> None:
        table = get_table("carts")
        normalized_id = item_id if item_id.startswith("ITEM#") else f"ITEM#{item_id}"
        table.delete_item(Key={"user_id": self._pk(user_sub), "item_id": normalized_id})

    def clear_cart(self, user_sub: str) -> None:
        items = self.list_items(user_sub)
        table = get_table("carts")
        for item in items:
            table.delete_item(Key={"user_id": self._pk(user_sub), "item_id": item["item_id"]})


class WishlistRepository:
    """
    DynamoDB Repository for Customer Wishlists (`lenscart-wishlists`).
    Strictly isolated by partition key `PK = USER#<cognito_sub>`.
    """

    @staticmethod
    def _pk(user_sub: str) -> str:
        return f"USER#{user_sub}"

    def list_items(self, user_sub: str) -> List[Dict[str, Any]]:
        table = get_table("wishlists")
        resp = table.query(KeyConditionExpression=Key("user_id").eq(self._pk(user_sub)))
        return [decimal_to_native(i) for i in resp.get("Items", [])]

    def add_item(self, user_sub: str, product_id: str) -> Dict[str, Any]:
        table = get_table("wishlists")
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "user_id": self._pk(user_sub),
            "product_id": product_id,
            "added_at": now,
        }
        table.put_item(Item=record)
        return record

    def remove_item(self, user_sub: str, product_id: str) -> None:
        table = get_table("wishlists")
        table.delete_item(Key={"user_id": self._pk(user_sub), "product_id": product_id})


class AddressRepository:
    """
    DynamoDB Repository for Customer Delivery Addresses (`lenscart-addresses`).
    Strictly isolated by partition key `PK = USER#<cognito_sub>`.
    """

    @staticmethod
    def _pk(user_sub: str) -> str:
        return f"USER#{user_sub}"

    def list_addresses(self, user_sub: str) -> List[Dict[str, Any]]:
        table = get_table("addresses")
        resp = table.query(KeyConditionExpression=Key("user_id").eq(self._pk(user_sub)))
        items = [decimal_to_native(i) for i in resp.get("Items", [])]
        items.sort(key=lambda a: (not a.get("is_default", False), a.get("created_at", "")))
        return items

    def get_address(self, user_sub: str, address_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("addresses")
        resp = table.get_item(Key={"user_id": self._pk(user_sub), "address_id": address_id})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def create_address(self, user_sub: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        table = get_table("addresses")
        existing = self.list_addresses(user_sub)
        is_default = bool(payload.get("is_default", False)) or len(existing) == 0

        if is_default:
            for addr in existing:
                if addr.get("is_default"):
                    addr["is_default"] = False
                    table.put_item(Item=float_to_decimal(addr))

        address_id = payload.get("address_id") or f"ADDR#{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()
        record = {
            **payload,
            "user_id": self._pk(user_sub),
            "address_id": address_id,
            "is_default": is_default,
            "created_at": now,
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)

    def delete_address(self, user_sub: str, address_id: str) -> bool:
        existing = self.get_address(user_sub, address_id)
        if not existing:
            return False
        table = get_table("addresses")
        table.delete_item(Key={"user_id": self._pk(user_sub), "address_id": address_id})
        return True

