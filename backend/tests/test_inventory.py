from tests.conftest import InProcessASGIClient, get_auth_headers


def test_inventory_listing_adjustment_and_logs(client: InProcessASGIClient):
    admin_headers = get_auth_headers(client, "admin@lenscart.store", "Admin@Lens2026")

    inv_res = client.get("/admin/inventory", headers=admin_headers)
    assert inv_res.status_code == 200
    all_records = inv_res.json()["data"]
    assert len(all_records) >= 29

    low_res = client.get("/admin/inventory", params={"low_stock_only": True}, headers=admin_headers)
    assert low_res.status_code == 200
    assert len(low_res.json()["data"]) >= 1

    # Adjust stock on Sony CFexpress card
    before = next(r for r in all_records if r["product_id"] == "PROD#stor-sony-cfexpress-160")
    adj_res = client.post(
        "/admin/inventory/PROD%23stor-sony-cfexpress-160/adjust",
        headers=admin_headers,
        json={"delta": 10, "reason": "Restock shipment arrived"},
    )
    assert adj_res.status_code == 200
    assert adj_res.json()["data"]["available_qty"] == before["available_qty"] + 10

    # Verify movement logs endpoint
    logs_res = client.get(
        "/admin/inventory/PROD%23stor-sony-cfexpress-160/logs",
        headers=admin_headers,
    )
    assert logs_res.status_code == 200
    logs = logs_res.json()["data"]
    assert len(logs) >= 2
    assert any("Restock shipment arrived" in l["reason"] for l in logs)

