import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import status
from app.aws.cognito import cognito_idp
from app.aws.sns import publish_order_notification
from app.middleware.security import AppError
from app.repositories.category_repo import CategoryRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.order_review_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.services.catalog_service import catalog_service


class AdminService:
    def __init__(self) -> None:
        self.prod_repo = ProductRepository()
        self.cat_repo = CategoryRepository()
        self.inv_repo = InventoryRepository()
        self.ord_repo = OrderRepository()

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        all_orders = self.ord_repo.list_all_orders()
        all_products = self.prod_repo.query_active_catalog(include_inactive=True)
        all_customers = cognito_idp.list_all_customers()
        low_stock_items = self.inv_repo.list_all_inventory(low_stock_only=True)

        successful_orders = [o for o in all_orders if o.get("order_status") != "Cancelled"]
        total_revenue = round(sum(float(o.get("final_total", 0)) for o in successful_orders), 2)
        pending_statuses = {"Placed", "Confirmed", "Processing", "Packed"}
        pending_orders = [o for o in all_orders if o.get("order_status") in pending_statuses]

        # Status breakdown
        status_breakdown: Dict[str, int] = defaultdict(int)
        for o in all_orders:
            status_breakdown[o.get("order_status", "Placed")] += 1

        # Daily & Monthly sales aggregations
        daily_map: Dict[str, Dict[str, Any]] = {}
        monthly_map: Dict[str, Dict[str, Any]] = {}
        category_rev: Dict[str, Dict[str, Any]] = {}

        prod_cat_lookup = {p["product_id"]: p.get("category_name", "Cameras") for p in all_products}

        for o in successful_orders:
            created = str(o.get("created_at", ""))[:10]
            month_key = created[:7] if len(created) >= 7 else "2026-11"
            rev = float(o.get("final_total", 0))

            if created not in daily_map:
                daily_map[created] = {"date": created, "revenue": 0.0, "orders": 0}
            daily_map[created]["revenue"] = round(daily_map[created]["revenue"] + rev, 2)
            daily_map[created]["orders"] += 1

            if month_key not in monthly_map:
                monthly_map[month_key] = {"month": month_key, "revenue": 0.0, "orders": 0}
            monthly_map[month_key]["revenue"] = round(monthly_map[month_key]["revenue"] + rev, 2)
            monthly_map[month_key]["orders"] += 1

            for item in o.get("items", []):
                cname = prod_cat_lookup.get(item["product_id"], "Cameras")
                if cname not in category_rev:
                    category_rev[cname] = {"category": cname, "revenue": 0.0, "units_sold": 0}
                category_rev[cname]["revenue"] = round(
                    category_rev[cname]["revenue"] + float(item.get("line_total", 0)), 2
                )
                category_rev[cname]["units_sold"] += int(item.get("quantity", 1))

        cat_list = list(category_rev.values())
        cat_total_rev = sum(c["revenue"] for c in cat_list) or 1.0
        for c in cat_list:
            c["share_percent"] = round((c["revenue"] / cat_total_rev) * 100, 1)
        cat_list.sort(key=lambda x: x["revenue"], reverse=True)

        enriched_products = [catalog_service.enrich_product_with_stock(p) for p in all_products]
        popular_products = sorted(
            enriched_products, key=lambda x: x.get("popularity_score", 0), reverse=True
        )[:6]

        return {
            "total_orders": len(all_orders),
            "total_products": len(all_products),
            "total_customers": len(all_customers),
            "total_revenue": total_revenue,
            "pending_orders_count": len(pending_orders),
            "low_stock_count": len(low_stock_items),
            "recent_orders": all_orders[:8],
            "low_stock_products": low_stock_items,
            "popular_products": popular_products,
            "daily_sales": sorted(daily_map.values(), key=lambda d: d["date"]),
            "monthly_sales": sorted(monthly_map.values(), key=lambda m: m["month"]),
            "category_performance": cat_list,
            "order_status_breakdown": dict(status_breakdown),
        }

    def create_product(self, payload: Dict[str, Any], admin_user: Dict[str, Any]) -> Dict[str, Any]:
        cat = self.cat_repo.get_by_id(payload["category_id"])
        if not cat:
            raise AppError("CATEGORY_NOT_FOUND", "Invalid category_id.", status.HTTP_400_BAD_REQUEST)

        slug = re.sub(r"[^a-z0-9]+", "-", payload["name"].lower()).strip("-")
        product_id = f"PROD#{slug[:28]}-{uuid.uuid4().hex[:4]}"
        now = datetime.now(timezone.utc).isoformat()
        initial_stock = int(payload.pop("initial_stock", 15))
        low_threshold = int(payload.get("low_stock_threshold", 5))

        record = {
            **payload,
            "product_id": product_id,
            "slug": slug,
            "category_slug": cat["slug"],
            "category_name": cat["name"],
            "rating_avg": 5.0,
            "review_count": 0,
            "popularity_score": 850,
            "catalog_status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        }
        saved = self.prod_repo.put_product(record)
        self.inv_repo.put_stock_record(
            product_id=product_id,
            sku=saved["sku"],
            product_name=saved["name"],
            brand=saved["brand"],
            category_name=saved["category_name"],
            available_qty=initial_stock,
            reserved_qty=0,
            low_stock_threshold=low_threshold,
        )
        self.inv_repo.append_stock_log(
            product_id=product_id,
            delta=initial_stock,
            previous_qty=0,
            new_qty=initial_stock,
            reason="Initial stock on product creation",
            actor=admin_user["name"],
        )
        return catalog_service.enrich_product_with_stock(saved)

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        updated = self.prod_repo.update_product(product_id, updates)
        if not updated:
            raise AppError("PRODUCT_NOT_FOUND", f"Product '{product_id}' not found.", status.HTTP_404_NOT_FOUND)
        return catalog_service.enrich_product_with_stock(updated)

    def delete_or_deactivate_product(self, product_id: str) -> Dict[str, str]:
        updated = self.prod_repo.update_product(product_id, {"catalog_status": "INACTIVE"})
        if not updated:
            raise AppError("PRODUCT_NOT_FOUND", f"Product '{product_id}' not found.", status.HTTP_404_NOT_FOUND)
        return {"product_id": product_id, "status": "INACTIVE"}

    def list_orders(self, status_filter: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        if status_filter:
            orders = self.ord_repo.list_orders_by_status(status_filter)
        else:
            orders = self.ord_repo.list_all_orders()

        if search:
            q = search.strip().lower()
            orders = [
                o
                for o in orders
                if q in o.get("order_id", "").lower()
                or q in o.get("customer_name", "").lower()
                or q in o.get("customer_email", "").lower()
            ]
        return orders

    def update_order_status(
        self, order_id: str, new_status: str, note: Optional[str], admin_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        existing = self.ord_repo.get_order_by_id(order_id)
        if not existing:
            raise AppError("ORDER_NOT_FOUND", f"Order '{order_id}' not found.", status.HTTP_404_NOT_FOUND)

        if new_status == "Cancelled" and existing["order_status"] != "Cancelled":
            for item in existing.get("items", []):
                self.inv_repo.release_reserved_stock(
                    product_id=item["product_id"],
                    quantity=int(item["quantity"]),
                    order_id=order_id,
                    actor=admin_user["name"],
                )

        payment_status = "REFUNDED_SIMULATED" if new_status == "Cancelled" else None
        updated = self.ord_repo.update_order_status(
            order_id=order_id,
            new_status=new_status,
            note=note or f"Order status updated to {new_status} by administrator.",
            actor=admin_user["name"],
            payment_status=payment_status,
        )
        publish_order_notification(
            subject=f"LensCart Order {order_id}: {new_status}",
            payload={"order_id": order_id, "status": new_status, "updated_by": admin_user["email"]},
        )
        return updated

    def list_customers_with_stats(self) -> List[Dict[str, Any]]:
        customers = cognito_idp.list_all_customers()
        enriched: List[Dict[str, Any]] = []
        for c in customers:
            user_orders = self.ord_repo.list_orders_for_user(c["sub"])
            valid_orders = [o for o in user_orders if o.get("order_status") != "Cancelled"]
            spent = round(sum(float(o.get("final_total", 0)) for o in valid_orders), 2)
            enriched.append(
                {
                    **c,
                    "order_count": len(user_orders),
                    "total_spent": spent,
                    "recent_orders": user_orders[:5],
                }
            )
        return enriched


admin_service = AdminService()

