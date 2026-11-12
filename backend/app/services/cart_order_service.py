import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List
from fastapi import status
from app.aws.sns import publish_order_notification
from app.aws.sqs import enqueue_order_event
from app.handlers.sqs_worker import process_pending_sqs_orders
from app.middleware.security import AppError
from app.repositories.customer_repo import (
    AddressRepository,
    CartRepository,
    WishlistRepository,
)
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.order_review_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.services.catalog_service import catalog_service
from app.utils.pricing import compute_cart_totals, compute_final_price


class CartAndOrderService:
    def __init__(self) -> None:
        self.cart_repo = CartRepository()
        self.wish_repo = WishlistRepository()
        self.addr_repo = AddressRepository()
        self.prod_repo = ProductRepository()
        self.inv_repo = InventoryRepository()
        self.ord_repo = OrderRepository()
        self._idempotency_map: Dict[str, str] = {}

    def get_cart_summary(self, user_sub: str) -> Dict[str, Any]:
        raw_items = self.cart_repo.list_items(user_sub)
        enriched_items: List[Dict[str, Any]] = []
        has_stock_issues = False

        for ci in raw_items:
            pid = ci["product_id"]
            prod = self.prod_repo.get_by_id(pid)
            if not prod or prod.get("catalog_status") != "ACTIVE":
                self.cart_repo.remove_item(user_sub, ci["item_id"])
                continue
            stock = self.inv_repo.get_stock(pid)
            avail = int(stock["available_qty"]) if stock else 0
            qty = int(ci["quantity"])
            unit_price = float(prod["price"])
            discount_pct = float(prod.get("discount_percent", 0))
            final_unit = compute_final_price(unit_price, discount_pct)

            line_subtotal = round(unit_price * qty, 2)
            line_total = round(final_unit * qty, 2)
            line_discount = round(line_subtotal - line_total, 2)

            stock_warning = None
            if avail <= 0:
                stock_warning = "Currently out of stock"
                has_stock_issues = True
            elif qty > avail:
                stock_warning = f"Only {avail} available in stock"
                has_stock_issues = True

            enriched_items.append(
                {
                    "item_id": ci["item_id"],
                    "product_id": pid,
                    "name": prod["name"],
                    "brand": prod["brand"],
                    "image": (prod.get("images") or [""])[0],
                    "category_name": prod.get("category_name", ""),
                    "unit_price": unit_price,
                    "discount_percent": discount_pct,
                    "final_unit_price": final_unit,
                    "quantity": qty,
                    "line_subtotal": line_subtotal,
                    "line_discount": line_discount,
                    "line_total": line_total,
                    "available_qty": avail,
                    "in_stock": avail >= qty and avail > 0,
                    "stock_warning": stock_warning,
                }
            )

        totals = compute_cart_totals(enriched_items)
        return {
            "user_id": f"USER#{user_sub}",
            "items": enriched_items,
            "item_count": sum(i["quantity"] for i in enriched_items),
            "has_stock_issues": has_stock_issues,
            **totals,
        }

    def add_to_cart(self, user_sub: str, product_id: str, quantity: int) -> Dict[str, Any]:
        prod = self.prod_repo.get_by_id(product_id)
        if not prod or prod.get("catalog_status") != "ACTIVE":
            raise AppError("PRODUCT_NOT_FOUND", "Product not found or inactive.", status.HTTP_404_NOT_FOUND)

        stock = self.inv_repo.get_stock(product_id)
        avail = int(stock["available_qty"]) if stock else 0
        existing = self.cart_repo.get_item(user_sub, f"ITEM#{product_id}")
        new_qty = (int(existing["quantity"]) if existing else 0) + quantity

        if avail <= 0 or new_qty > avail:
            raise AppError(
                "INSUFFICIENT_STOCK",
                f"Requested quantity ({new_qty}) exceeds available stock ({avail}) for {prod['name']}.",
                status.HTTP_409_CONFLICT,
                details={"product_id": product_id, "available": avail, "requested": new_qty},
            )

        self.cart_repo.upsert_item(user_sub, product_id, new_qty)
        return self.get_cart_summary(user_sub)

    def update_cart_item(self, user_sub: str, item_id: str, quantity: int) -> Dict[str, Any]:
        normalized_id = item_id if item_id.startswith("ITEM#") else f"ITEM#{item_id}"
        existing = self.cart_repo.get_item(user_sub, normalized_id)
        if not existing:
            raise AppError("CART_ITEM_NOT_FOUND", "Item not found in cart.", status.HTTP_404_NOT_FOUND)

        if quantity <= 0:
            self.cart_repo.remove_item(user_sub, normalized_id)
            return self.get_cart_summary(user_sub)

        product_id = existing["product_id"]
        stock = self.inv_repo.get_stock(product_id)
        avail = int(stock["available_qty"]) if stock else 0
        if quantity > avail:
            raise AppError(
                "INSUFFICIENT_STOCK",
                f"Only {avail} units available in stock.",
                status.HTTP_409_CONFLICT,
                details={"product_id": product_id, "available": avail, "requested": quantity},
            )

        self.cart_repo.upsert_item(user_sub, product_id, quantity)
        return self.get_cart_summary(user_sub)

    def remove_from_cart(self, user_sub: str, item_id: str) -> Dict[str, Any]:
        self.cart_repo.remove_item(user_sub, item_id)
        return self.get_cart_summary(user_sub)

    # Wishlist operations
    def get_wishlist(self, user_sub: str) -> List[Dict[str, Any]]:
        rows = self.wish_repo.list_items(user_sub)
        result: List[Dict[str, Any]] = []
        for r in rows:
            prod = self.prod_repo.get_by_id(r["product_id"])
            if prod and prod.get("catalog_status") == "ACTIVE":
                result.append(
                    {
                        "product_id": r["product_id"],
                        "added_at": r["added_at"],
                        "product": catalog_service.enrich_product_with_stock(prod),
                    }
                )
        return result

    def add_to_wishlist(self, user_sub: str, product_id: str) -> List[Dict[str, Any]]:
        prod = self.prod_repo.get_by_id(product_id)
        if not prod:
            raise AppError("PRODUCT_NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)
        self.wish_repo.add_item(user_sub, product_id)
        return self.get_wishlist(user_sub)

    def remove_from_wishlist(self, user_sub: str, product_id: str) -> List[Dict[str, Any]]:
        self.wish_repo.remove_item(user_sub, product_id)
        return self.get_wishlist(user_sub)

    # Order placement & lifecycle
    def place_order(
        self,
        user: Dict[str, Any],
        address_id: str,
        payment_method: str,
        idempotency_key: str,
    ) -> Dict[str, Any]:
        user_sub = user["sub"]
        idem_hash = hashlib.sha256(f"{user_sub}:{idempotency_key}".encode()).hexdigest()
        if idem_hash in self._idempotency_map:
            existing_ord = self.ord_repo.get_order_by_id(self._idempotency_map[idem_hash])
            if existing_ord:
                return existing_ord

        address = self.addr_repo.get_address(user_sub, address_id)
        if not address:
            raise AppError(
                "INVALID_ADDRESS",
                "Selected delivery address was not found for your account.",
                status.HTTP_400_BAD_REQUEST,
            )

        cart = self.get_cart_summary(user_sub)
        if not cart["items"]:
            raise AppError(
                "EMPTY_CART",
                "Cannot place an order with an empty shopping cart.",
                status.HTTP_400_BAD_REQUEST,
            )

        if cart["has_stock_issues"]:
            raise AppError(
                "INSUFFICIENT_STOCK",
                "One or more items in your cart exceed available stock.",
                status.HTTP_409_CONFLICT,
            )

        order_id = f"ORD#LC-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        # Reserve stock atomically with rollback support if any item fails conditional check
        reserved_so_far: List[tuple[str, int]] = []
        try:
            for item in cart["items"]:
                self.inv_repo.reserve_stock_conditional(
                    product_id=item["product_id"],
                    quantity=int(item["quantity"]),
                    order_id=order_id,
                    actor=user["name"],
                )
                reserved_so_far.append((item["product_id"], int(item["quantity"])))
        except Exception:
            for r_pid, r_qty in reserved_so_far:
                self.inv_repo.release_reserved_stock(r_pid, r_qty, order_id, "Transaction Rollback")
            raise

        order_items = [
            {
                "product_id": i["product_id"],
                "sku": (self.prod_repo.get_by_id(i["product_id"]) or {}).get("sku", ""),
                "name": i["name"],
                "brand": i["brand"],
                "image": i["image"],
                "quantity": i["quantity"],
                "unit_price": i["unit_price"],
                "discount_percent": i["discount_percent"],
                "final_unit_price": i["final_unit_price"],
                "line_total": i["line_total"],
            }
            for i in cart["items"]
        ]

        order_payload = {
            "order_id": order_id,
            "user_id": f"USER#{user_sub}",
            "customer_name": user["name"],
            "customer_email": user["email"],
            "items": order_items,
            "shipping_address": address,
            "subtotal": cart["subtotal"],
            "discount_total": cart["discount_total"],
            "shipping_fee": cart["shipping_fee"],
            "tax_amount": cart["tax_amount"],
            "final_total": cart["final_total"],
            "order_status": "Placed",
            "payment_method": payment_method,
            "payment_status": "PAID_SIMULATED",
            "payment_reference": f"SIM-PAY-{uuid.uuid4().hex[:6].upper()}",
            "timeline": [
                {
                    "status": "Placed",
                    "timestamp": now,
                    "note": f"Order placed with simulated payment ({payment_method}) and stock reserved.",
                    "actor": user["name"],
                }
            ],
            "created_at": now,
            "updated_at": now,
        }

        created_order = self.ord_repo.create_order(order_payload)
        self.cart_repo.clear_cart(user_sub)
        self._idempotency_map[idem_hash] = order_id

        # Publish to SQS for asynchronous order confirmation & SNS notification
        enqueue_order_event("ORDER_CREATED", created_order, idem_hash)
        process_pending_sqs_orders()

        return self.ord_repo.get_order_by_id(order_id) or created_order

    def get_customer_orders(self, user_sub: str) -> List[Dict[str, Any]]:
        return self.ord_repo.list_orders_for_user(user_sub)

    def get_customer_order_detail(self, user: Dict[str, Any], order_id: str) -> Dict[str, Any]:
        order = self.ord_repo.get_order_by_id(order_id)
        if not order:
            raise AppError("ORDER_NOT_FOUND", f"Order '{order_id}' not found.", status.HTTP_404_NOT_FOUND)
        is_admin = "Admin" in user.get("roles", [])
        if not is_admin and order.get("user_id") != f"USER#{user['sub']}":
            raise AppError(
                "FORBIDDEN",
                "You do not have permission to view another customer's order.",
                status.HTTP_403_FORBIDDEN,
            )
        return order

    def cancel_order(self, user: Dict[str, Any], order_id: str, reason: str) -> Dict[str, Any]:
        order = self.get_customer_order_detail(user, order_id)
        cancellable_statuses = {"Placed", "Confirmed", "Processing"}
        if order["order_status"] not in cancellable_statuses:
            raise AppError(
                "ORDER_NOT_CANCELLABLE",
                f"Orders in '{order['order_status']}' status can no longer be cancelled.",
                status.HTTP_409_CONFLICT,
            )

        for item in order.get("items", []):
            self.inv_repo.release_reserved_stock(
                product_id=item["product_id"],
                quantity=int(item["quantity"]),
                order_id=order_id,
                actor=user["name"],
            )

        updated = self.ord_repo.update_order_status(
            order_id=order_id,
            new_status="Cancelled",
            note=f"Cancelled: {reason}. Reserved stock restored to inventory.",
            actor=user["name"],
            payment_status="REFUNDED_SIMULATED",
        )
        publish_order_notification(
            subject=f"LensCart Order Cancelled: {order_id}",
            payload={"order_id": order_id, "status": "Cancelled", "reason": reason},
        )
        return updated


cart_order_service = CartAndOrderService()

