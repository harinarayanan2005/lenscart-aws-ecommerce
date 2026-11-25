import pytest
from app.utils.pricing import compute_cart_totals, compute_final_price
from tests.conftest import InProcessASGIClient, get_auth_headers


def test_pricing_calculations():
    assert compute_final_price(1000.00, 0) == 1000.00
    assert compute_final_price(3898.00, 5) == 3703.10
    with pytest.raises(ValueError):
        compute_final_price(-10, 0)
    with pytest.raises(ValueError):
        compute_final_price(100, 95)

    totals_over_500 = compute_cart_totals(
        [{"unit_price": 1000.00, "final_unit_price": 900.00, "quantity": 1}]
    )
    assert totals_over_500["shipping_fee"] == 0.00
    assert totals_over_500["final_total"] == 972.00

    totals_under_500 = compute_cart_totals(
        [{"unit_price": 200.00, "final_unit_price": 200.00, "quantity": 1}]
    )
    assert totals_under_500["shipping_fee"] == 19.99
    assert totals_under_500["final_total"] == 235.99


def test_customer_data_isolation_cart_orders_addresses(client: InProcessASGIClient):
    elena_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")
    julian_headers = get_auth_headers(client, "julian.chen@lenscart.store", "Customer@Lens2026")

    add_res = client.post(
        "/cart/items",
        headers=elena_headers,
        json={"product_id": "PROD#lens-fuji-33f14", "quantity": 2},
    )
    assert add_res.status_code == 200
    assert add_res.json()["data"]["item_count"] >= 2

    julian_cart = client.get("/cart", headers=julian_headers)
    assert julian_cart.status_code == 200
    assert julian_cart.json()["data"]["item_count"] == 0

    forbidden_order = client.get("/orders/ORD%23LC-2026-8841", headers=julian_headers)
    assert forbidden_order.status_code == 403


def test_order_creation_idempotency_stock_consistency_and_cancellation(client: InProcessASGIClient):
    cust_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")

    prod_before = client.get("/products/PROD%23cam-fuji-xt5").json()["data"]["product"]
    initial_stock = prod_before["available_qty"]

    current_cart = client.get("/cart", headers=cust_headers).json()["data"]
    for item in current_cart["items"]:
        client.delete(f"/cart/items/{item['item_id']}", headers=cust_headers)

    client.post(
        "/cart/items",
        headers=cust_headers,
        json={"product_id": "PROD#cam-fuji-xt5", "quantity": 2},
    )

    order_res = client.post(
        "/orders",
        headers=cust_headers,
        json={
            "address_id": "ADDR#default-elena",
            "payment_method": "SIMULATED_CARD",
            "idempotency_key": "test-idem-key-fuji-xt5-001",
        },
    )
    assert order_res.status_code == 201, order_res.text
    created_order = order_res.json()["data"]
    order_id = created_order["order_id"]
    assert created_order["order_status"] == "Confirmed"

    # Duplicate submission with same idempotency_key returns the exact same order without deducting stock again
    dup_res = client.post(
        "/orders",
        headers=cust_headers,
        json={
            "address_id": "ADDR#default-elena",
            "payment_method": "SIMULATED_CARD",
            "idempotency_key": "test-idem-key-fuji-xt5-001",
        },
    )
    assert dup_res.status_code == 201
    assert dup_res.json()["data"]["order_id"] == order_id

    prod_after = client.get("/products/PROD%23cam-fuji-xt5").json()["data"]["product"]
    assert prod_after["available_qty"] == initial_stock - 2

    cancel_res = client.post(
        f"/orders/{order_id}/cancel",
        headers=cust_headers,
        json={"reason": "Integration test cancellation"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["order_status"] == "Cancelled"
    assert cancel_res.json()["data"]["payment_status"] == "REFUNDED_SIMULATED"

    prod_restored = client.get("/products/PROD%23cam-fuji-xt5").json()["data"]["product"]
    assert prod_restored["available_qty"] == initial_stock
