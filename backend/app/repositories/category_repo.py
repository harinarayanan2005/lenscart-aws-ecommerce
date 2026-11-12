from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from app.aws.dynamodb import get_table
from app.utils.pricing import decimal_to_native, float_to_decimal


class CategoryRepository:
    """DynamoDB Repository for Categories (`lenscart-categories`). Never uses table scans."""

    def list_all(self) -> List[Dict[str, Any]]:
        table = get_table("categories")
        resp = table.query(KeyConditionExpression=Key("tenant_scope").eq("CATALOG"))
        items = [decimal_to_native(item) for item in resp.get("Items", [])]
        items.sort(key=lambda c: c.get("sort_order", 99))
        return items

    def get_by_id(self, category_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("categories")
        resp = table.get_item(Key={"tenant_scope": "CATALOG", "category_id": category_id})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def get_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        table = get_table("categories")
        resp = table.query(
            IndexName="GSI1-Slug",
            KeyConditionExpression=Key("slug").eq(slug),
        )
        items = resp.get("Items", [])
        return decimal_to_native(items[0]) if items else None

    def put_category(self, category: Dict[str, Any]) -> Dict[str, Any]:
        table = get_table("categories")
        record = {
            **category,
            "tenant_scope": "CATALOG",
            "sort_order_str": f"{int(category.get('sort_order', 1)):03d}",
        }
        table.put_item(Item=float_to_decimal(record))
        return decimal_to_native(record)

