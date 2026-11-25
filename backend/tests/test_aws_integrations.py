import json
import pytest
from app.aws.s3 import delete_product_image, generate_presigned_image_upload
from app.lambda_handlers.api_handler import handler as mangum_api_handler
from app.lambda_handlers.maintenance_handler import lambda_handler as maintenance_lambda_handler
from app.lambda_handlers.order_worker import lambda_handler as sqs_order_worker_handler
from app.middleware.security import AppError
from scripts.validate_aws_config import validate_aws_environment
from tests.conftest import InProcessASGIClient, get_auth_headers


def test_mangum_api_handler_and_config_validator():
    assert callable(mangum_api_handler)
    report = validate_aws_environment()
    assert report["valid"] is True
    assert report["aws_region"] == "ap-south-1"
    assert len(report["tables"]) == 8


def test_s3_presigned_upload_and_deletion(client: InProcessASGIClient):
    admin_headers = get_auth_headers(client, "admin@lenscart.store", "Admin@Lens2026")

    res = generate_presigned_image_upload("sony-a7rv-front.jpg", "image/jpeg", 1024 * 500, "cameras")
    assert "upload_url" in res
    assert res["object_key"].startswith("product_media/cameras/")
    assert res["expires_in"] == 300

    with pytest.raises(AppError) as exc_type:
        generate_presigned_image_upload("malware.exe", "application/x-msdownload", 1024)
    assert exc_type.value.code == "INVALID_FILE_TYPE"

    with pytest.raises(AppError) as exc_size:
        generate_presigned_image_upload("huge.png", "image/png", 10 * 1024 * 1024)
    assert exc_size.value.code == "FILE_SIZE_EXCEEDED"

    # Admin API image upload URL & delete image endpoints
    api_up = client.post(
        "/admin/products/upload-url",
        headers=admin_headers,
        json={
            "filename": "leica-sl3-top.webp",
            "content_type": "image/webp",
            "file_size_bytes": 204800,
            "category_folder": "cameras",
        },
    )
    assert api_up.status_code == 200
    obj_key = api_up.json()["data"]["object_key"]

    api_del = client.post(
        "/admin/products/delete-image",
        headers=admin_headers,
        json={"object_key": obj_key},
    )
    assert api_del.status_code == 200
    assert api_del.json()["data"]["deleted"] is True
    assert delete_product_image(obj_key) is True


def test_sqs_order_worker_idempotency_and_partial_batch_failures():
    event = {
        "Records": [
            {
                "messageId": "msg-valid-001",
                "body": json.dumps(
                    {
                        "event_type": "ORDER_CREATED",
                        "idempotency_key": "sqs-worker-test-key-001",
                        "order": {"order_id": "ORD#LC-2026-9012"},
                    }
                ),
            },
            {
                "messageId": "msg-duplicate-001",
                "body": json.dumps(
                    {
                        "event_type": "ORDER_CREATED",
                        "idempotency_key": "sqs-worker-test-key-001",
                        "order": {"order_id": "ORD#LC-2026-9012"},
                    }
                ),
            },
            {
                "messageId": "msg-invalid-json",
                "body": "{malformed_json",
            },
        ]
    }
    res = sqs_order_worker_handler(event, None)
    assert "batchItemFailures" in res
    assert res["batchItemFailures"] == [{"itemIdentifier": "msg-invalid-json"}]


def test_eventbridge_maintenance_lambda_handler():
    eb_res = maintenance_lambda_handler({}, None)
    assert eb_res["status"] == "OK"
    assert eb_res["low_stock_count"] >= 1

