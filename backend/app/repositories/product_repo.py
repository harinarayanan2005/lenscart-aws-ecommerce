from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from app.aws.dynamodb import get_table
from app.utils.pricing import compute_final_price, decimal_to_native, float_to_decimal


class ProductRepository:
    """
    DynamoDB Repository for Products (`lenscart-products`).
    Uses GetItem and GSI Queries (`GSI1-CategoryPrice`, `GSI2-StatusPopularity`, `GSI3-LensMount`).
    Never executes a table Scan.
    """

    @staticmethod
    def _build_index_keys(product: Dict[str, Any]) -> Dict[str, Any]:
        price = float(product.get("price", 0))
        discount = float(product.get("discount_percent", 0))
        final_price = compute_final_price(price, discount)
        pop_score = int(product.get("popularity_score", 100))
        pid = product["product_id"]
        mount = product.get("lens_mount") or product.get("specifications", {}).get("lens_mount") or "Universal"

        return {
            **product,
            "metadata": "META",
            "final_price": final_price,
            "lens_mount": mount,
            "price_sort_key": f"{int(round(final_price * 100)):010d}#{pid}",
            "popularity_sort_key": f"{pop_score:06d}#{pid}",
            "mount_index_key": f"MOUNT#{mount}",
        }

    def put_product(self, product: Dict[str, Any]) -> Dict[str, Any]:
        table = get_table("products")
        enriched = self._build_index_keys(product)
        table.put_item(Item=float_to_decimal(enriched))
        return decimal_to_native(enriched)

    def get_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        table = get_table("products")
        resp = table.get_item(Key={"product_id": product_id, "metadata": "META"})
        item = resp.get("Item")
        return decimal_to_native(item) if item else None

    def query_by_category(self, category_id: str) -> List[Dict[str, Any]]:
        table = get_table("products")
        resp = table.query(
            IndexName="GSI1-CategoryPrice",
            KeyConditionExpression=Key("category_id").eq(category_id),
        )
        return [
            decimal_to_native(i)
            for i in resp.get("Items", [])
            if i.get("catalog_status", "ACTIVE") == "ACTIVE"
        ]

    def query_active_catalog(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        table = get_table("products")
        resp = table.query(
            IndexName="GSI2-StatusPopularity",
            KeyConditionExpression=Key("catalog_status").eq("ACTIVE"),
            ScanIndexForward=False,
        )
        items = [decimal_to_native(i) for i in resp.get("Items", [])]
        if include_inactive:
            resp_inactive = table.query(
                IndexName="GSI2-StatusPopularity",
                KeyConditionExpression=Key("catalog_status").eq("INACTIVE"),
                ScanIndexForward=False,
            )
            items.extend(decimal_to_native(i) for i in resp_inactive.get("Items", []))
        return items

    def query_by_lens_mount(self, lens_mount: str) -> List[Dict[str, Any]]:
        table = get_table("products")
        resp = table.query(
            IndexName="GSI3-LensMount",
            KeyConditionExpression=Key("mount_index_key").eq(f"MOUNT#{lens_mount}"),
        )
        return [
            decimal_to_native(i)
            for i in resp.get("Items", [])
            if i.get("catalog_status", "ACTIVE") == "ACTIVE"
        ]

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_by_id(product_id)
        if not existing:
            return None
        merged = {
            **existing,
            **{k: v for k, v in updates.items() if v is not None},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return self.put_product(merged)

