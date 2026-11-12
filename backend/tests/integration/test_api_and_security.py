import json
from urllib.parse import unquote, urlencode, urlparse
import pytest
from app.main import app
from app.handlers.eventbridge_worker import lambda_handler as eb_lambda_handler


class ASGIResponse:
    def __init__(self, status_code: int, headers: dict[str, str], body: bytes):
        self.status_code = status_code
        self.headers = headers
        self.content = body
        self.text = body.decode("utf-8", errors="replace")

    def json(self):
        return json.loads(self.text)


def _drive_coroutine(coro):
    """Drives a pure in-memory ASGI coroutine to completion without Windows loopback sockets."""
    try:
        while True:
            coro.send(None)
    except StopIteration as stop:
        return stop.value


class InProcessASGIClient:
    """Executes HTTP requests against the FastAPI ASGI app in-process without socketpair."""

    def __init__(self, asgi_app):
        self.app = asgi_app

    def request(
        self,
        method: str,
        url: str,
        params: dict | None = None,
        json_body: dict | None = None,
        headers: dict | None = None,
        **kwargs,
    ) -> ASGIResponse:
        if "json" in kwargs and json_body is None:
            json_body = kwargs.pop("json")

        if "?" in url:
            raw_path_str, query_str = url.split("?", 1)
        else:
            raw_path_str, query_str = url, ""
        path = unquote(raw_path_str or "/")
        if params:
            extra_q = urlencode({k: v for k, v in params.items() if v is not None})
            query_str = f"{query_str}&{extra_q}".lstrip("&") if query_str else extra_q

        body_bytes = json.dumps(json_body).encode("utf-8") if json_body is not None else b""

        raw_headers = [
            (b"host", b"testserver"),
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body_bytes)).encode("ascii")),
        ]
        if headers:
            for k, v in headers.items():
                raw_headers.append((k.lower().encode("latin-1"), str(v).encode("latin-1")))

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method.upper(),
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": query_str.encode("ascii"),
            "headers": raw_headers,
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
        }

        request_sent = False
        status_code = 200
        resp_headers: dict[str, str] = {}
        resp_chunks: list[bytes] = []

        async def receive():
            nonlocal request_sent
            if not request_sent:
                request_sent = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                for hk, hv in message.get("headers", []):
                    resp_headers[hk.decode("latin-1").lower()] = hv.decode("latin-1")
            elif message["type"] == "http.response.body":
                resp_chunks.append(message.get("body", b""))

        _drive_coroutine(self.app(scope, receive, send))
        return ASGIResponse(status_code, resp_headers, b"".join(resp_chunks))

    def get(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("DELETE", url, **kwargs)


TestClient = InProcessASGIClient


@pytest.fixture(scope="module")
def client():
    return InProcessASGIClient(app)


def get_auth_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_and_seeded_categories(client: TestClient):
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["data"]["status"] == "healthy"

    cats = client.get("/categories")
    assert cats.status_code == 200
    cat_list = cats.json()["data"]
    assert len(cat_list) == 8
    slugs = [c["slug"] for c in cat_list]
    assert "cameras" in slugs
    assert "lenses" in slugs
    assert "tripods" in slugs
    assert "lighting" in slugs


def test_product_catalogue_filtering_and_compatibility_and_comparison(client: TestClient):
    # Filter by category & lens mount
    res = client.get("/products", params={"category_id": "CAT#lenses", "lens_mount": "Sony E"})
    assert res.status_code == 200
    lenses = res.json()["data"]
    assert len(lenses) >= 2
    assert all(l["lens_mount"] == "Sony E" for l in lenses)

    # Check camera-lens compatibility endpoint
    compat = client.get("/products/PROD%23cam-sony-a7rv/compatibility")
    assert compat.status_code == 200
    compat_data = compat.json()["data"]
    assert compat_data["lens_mount"] == "Sony E"
    compat_lens_ids = [l["product_id"] for l in compat_data["compatible_lenses"]]
    assert "PROD#lens-sony-2470gm2" in compat_lens_ids
    assert "PROD#lens-sigma-85dgdn" in compat_lens_ids
    # Ensure Canon RF lens is NOT returned as compatible with Sony E camera
    assert "PROD#lens-canon-2870f2" not in compat_lens_ids

    # Compare 2 cameras side by side
    comp = client.post(
        "/products/compare",
        json={"product_ids": ["PROD#cam-sony-a7rv", "PROD#cam-canon-r5mk2"]},
    )
    assert comp.status_code == 200
    comp_data = comp.json()["data"]
    assert len(comp_data["products"]) == 2
    assert "megapixels" in comp_data["comparison_matrix"]


def test_authentication_and_rbac_protection(client: TestClient):
    # Unauthenticated request to /auth/me fails with 401
    unauth = client.get("/auth/me")
    assert unauth.status_code == 401

    # Customer login succeeds
    cust_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")
    me = client.get("/auth/me", headers=cust_headers)
    assert me.status_code == 200
    assert me.json()["data"]["email"] == "elena.vance@lenscart.store"

    # Customer cannot access Admin endpoints (403 Forbidden)
    admin_attempt = client.get("/admin/dashboard", headers=cust_headers)
    assert admin_attempt.status_code == 403
    assert admin_attempt.json()["error"]["code"] == "ADMIN_REQUIRED"

    # Customer cannot create or delete products
    prod_attempt = client.post("/admin/products", headers=cust_headers, json={})
    assert prod_attempt.status_code == 403


def test_customer_data_isolation_cart_orders_addresses(client: TestClient):
    elena_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")
    julian_headers = get_auth_headers(client, "julian.chen@lenscart.store", "Customer@Lens2026")

    # Elena adds a lens to her cart
    add_res = client.post(
        "/cart/items",
        headers=elena_headers,
        json={"product_id": "PROD#lens-fuji-33f14", "quantity": 2},
    )
    assert add_res.status_code == 200
    assert add_res.json()["data"]["item_count"] >= 2

    # Julian's cart must remain completely isolated (empty)
    julian_cart = client.get("/cart", headers=julian_headers)
    assert julian_cart.status_code == 200
    assert julian_cart.json()["data"]["item_count"] == 0

    # Julian cannot view Elena's historical order (403 Forbidden)
    forbidden_order = client.get("/orders/ORD%23LC-2026-8841", headers=julian_headers)
    assert forbidden_order.status_code == 403


def test_order_creation_stock_consistency_and_cancellation(client: TestClient):
    cust_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")
    admin_headers = get_auth_headers(client, "admin@lenscart.store", "Admin@Lens2026")

    # Check initial stock of Fujifilm X-T5
    prod_before = client.get("/products/PROD%23cam-fuji-xt5").json()["data"]["product"]
    initial_stock = prod_before["available_qty"]

    # Clear cart items and add 2 units of Fujifilm X-T5
    current_cart = client.get("/cart", headers=cust_headers).json()["data"]
    for item in current_cart["items"]:
        client.delete(f"/cart/items/{item['item_id']}", headers=cust_headers)

    client.post(
        "/cart/items",
        headers=cust_headers,
        json={"product_id": "PROD#cam-fuji-xt5", "quantity": 2},
    )

    # Place order (triggers DynamoDB atomic stock reservation + SQS worker confirmation)
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
    # Verify SQS worker automatically transitioned Placed -> Confirmed
    assert created_order["order_status"] == "Confirmed"

    # Verify stock decreased by 2
    prod_after = client.get("/products/PROD%23cam-fuji-xt5").json()["data"]["product"]
    assert prod_after["available_qty"] == initial_stock - 2

    # Cancel order and verify stock is restored to initial_stock
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

    # Verify Admin dashboard and inventory endpoints
    dash = client.get("/admin/dashboard", headers=admin_headers)
    assert dash.status_code == 200
    assert dash.json()["data"]["total_products"] >= 14

    # Verify EventBridge daily maintenance handler
    eb_res = eb_lambda_handler({}, None)
    assert eb_res["status"] == "OK"
    assert eb_res["low_stock_count"] >= 1

