import pytest
from app.utils.pricing import compute_cart_totals, compute_final_price
from app.aws.s3 import generate_presigned_image_upload
from app.middleware.security import AppError


def test_compute_final_price_discounts():
    assert compute_final_price(1000.00, 0) == 1000.00
    assert compute_final_price(3898.00, 5) == 3703.10
    assert compute_final_price(2298.00, 4) == 2206.08


def test_compute_final_price_rejects_invalid_inputs():
    with pytest.raises(ValueError):
        compute_final_price(-10.0, 5)
    with pytest.raises(ValueError):
        compute_final_price(500.0, 95)


def test_cart_totals_free_shipping_over_500():
    items = [
        {
            "quantity": 1,
            "unit_price": 1000.00,
            "final_unit_price": 900.00,
        },
        {
            "quantity": 2,
            "unit_price": 250.00,
            "final_unit_price": 250.00,
        },
    ]
    totals = compute_cart_totals(items)
    # Subtotal = 1000 + 500 = 1500
    # Discounted subtotal = 900 + 500 = 1400 (Savings = 100)
    # Shipping = 0 (since 1400 >= 500)
    # Tax = 8% of 1400 = 112.00
    # Final total = 1512.00
    assert totals["subtotal"] == 1500.00
    assert totals["discount_total"] == 100.00
    assert totals["shipping_fee"] == 0.00
    assert totals["tax_amount"] == 112.00
    assert totals["final_total"] == 1512.00


def test_cart_totals_shipping_applied_under_500():
    items = [
        {
            "quantity": 1,
            "unit_price": 250.00,
            "final_unit_price": 250.00,
        }
    ]
    totals = compute_cart_totals(items)
    assert totals["subtotal"] == 250.00
    assert totals["shipping_fee"] == 19.99
    assert totals["tax_amount"] == 20.00
    assert totals["final_total"] == 289.99


def test_s3_presigned_upload_validation():
    # Valid WebP under 5MB succeeds
    res = generate_presigned_image_upload("camera.webp", "image/webp", 512000)
    assert "upload_url" in res
    assert res["object_key"].startswith("products/")
    assert res["expires_in"] == 300

    # Disallowed MIME type rejected
    with pytest.raises(AppError) as exc_info:
        generate_presigned_image_upload("malicious.exe", "application/x-msdownload", 1024)
    assert exc_info.value.code == "INVALID_FILE_TYPE"

    # File larger than 5MB rejected
    with pytest.raises(AppError) as exc_size:
        generate_presigned_image_upload("huge.jpg", "image/jpeg", 10 * 1024 * 1024)
    assert exc_size.value.code == "FILE_SIZE_EXCEEDED"

