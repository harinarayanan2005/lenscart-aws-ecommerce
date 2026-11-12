import os
import boto3
from botocore.exceptions import ClientError
from app.config import settings
from app.utils.logger import logger

_moto_mock = None
_initialized = False


def ensure_local_aws_mock() -> None:
    """Starts in-process Moto AWS emulation when USE_LOCAL_AWS=True and no custom endpoint is set."""
    global _moto_mock
    if settings.USE_LOCAL_AWS and not settings.DYNAMODB_ENDPOINT_URL and _moto_mock is None:
        os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
        os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
        os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
        os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
        os.environ.setdefault("AWS_DEFAULT_REGION", settings.AWS_REGION)
        os.environ.setdefault("AWS_EC2_METADATA_DISABLED", "true")
        from moto import mock_aws

        _moto_mock = mock_aws()
        _moto_mock.start()
        logger.info("Started in-process Moto AWS emulation for DynamoDB, S3, SQS, and SNS.")


def get_dynamodb_resource():
    ensure_local_aws_mock()
    kwargs = {"region_name": settings.AWS_REGION}
    if settings.DYNAMODB_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.DYNAMODB_ENDPOINT_URL
    return boto3.resource("dynamodb", **kwargs)


def get_dynamodb_client():
    ensure_local_aws_mock()
    kwargs = {"region_name": settings.AWS_REGION}
    if settings.DYNAMODB_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.DYNAMODB_ENDPOINT_URL
    return boto3.client("dynamodb", **kwargs)


def get_table(entity: str):
    ddb = get_dynamodb_resource()
    return ddb.Table(settings.table_name(entity))


TABLE_DEFINITIONS = [
    {
        "entity": "categories",
        "KeySchema": [
            {"AttributeName": "tenant_scope", "KeyType": "HASH"},
            {"AttributeName": "category_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "tenant_scope", "AttributeType": "S"},
            {"AttributeName": "category_id", "AttributeType": "S"},
            {"AttributeName": "slug", "AttributeType": "S"},
            {"AttributeName": "sort_order_str", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "GSI1-Slug",
                "KeySchema": [
                    {"AttributeName": "slug", "KeyType": "HASH"},
                    {"AttributeName": "sort_order_str", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            }
        ],
    },
    {
        "entity": "products",
        "KeySchema": [
            {"AttributeName": "product_id", "KeyType": "HASH"},
            {"AttributeName": "metadata", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "product_id", "AttributeType": "S"},
            {"AttributeName": "metadata", "AttributeType": "S"},
            {"AttributeName": "category_id", "AttributeType": "S"},
            {"AttributeName": "price_sort_key", "AttributeType": "S"},
            {"AttributeName": "catalog_status", "AttributeType": "S"},
            {"AttributeName": "popularity_sort_key", "AttributeType": "S"},
            {"AttributeName": "mount_index_key", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "GSI1-CategoryPrice",
                "KeySchema": [
                    {"AttributeName": "category_id", "KeyType": "HASH"},
                    {"AttributeName": "price_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
            {
                "IndexName": "GSI2-StatusPopularity",
                "KeySchema": [
                    {"AttributeName": "catalog_status", "KeyType": "HASH"},
                    {"AttributeName": "popularity_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
            {
                "IndexName": "GSI3-LensMount",
                "KeySchema": [
                    {"AttributeName": "mount_index_key", "KeyType": "HASH"},
                    {"AttributeName": "price_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
        ],
    },
    {
        "entity": "inventory",
        "KeySchema": [
            {"AttributeName": "product_id", "KeyType": "HASH"},
            {"AttributeName": "record_type", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "product_id", "AttributeType": "S"},
            {"AttributeName": "record_type", "AttributeType": "S"},
            {"AttributeName": "stock_alert_status", "AttributeType": "S"},
            {"AttributeName": "qty_sort_key", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "GSI1-StockAlert",
                "KeySchema": [
                    {"AttributeName": "stock_alert_status", "KeyType": "HASH"},
                    {"AttributeName": "qty_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            }
        ],
    },
    {
        "entity": "carts",
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "item_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "item_id", "AttributeType": "S"},
        ],
    },
    {
        "entity": "wishlists",
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "product_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "product_id", "AttributeType": "S"},
        ],
    },
    {
        "entity": "addresses",
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "address_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "address_id", "AttributeType": "S"},
        ],
    },
    {
        "entity": "orders",
        "KeySchema": [
            {"AttributeName": "order_id", "KeyType": "HASH"},
            {"AttributeName": "record_type", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "order_id", "AttributeType": "S"},
            {"AttributeName": "record_type", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "created_sort_key", "AttributeType": "S"},
            {"AttributeName": "order_status", "AttributeType": "S"},
            {"AttributeName": "all_orders_partition", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "GSI1-UserOrders",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                    {"AttributeName": "created_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
            {
                "IndexName": "GSI2-StatusOrders",
                "KeySchema": [
                    {"AttributeName": "order_status", "KeyType": "HASH"},
                    {"AttributeName": "created_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
            {
                "IndexName": "GSI3-AllOrders",
                "KeySchema": [
                    {"AttributeName": "all_orders_partition", "KeyType": "HASH"},
                    {"AttributeName": "created_sort_key", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            },
        ],
    },
    {
        "entity": "reviews",
        "KeySchema": [
            {"AttributeName": "product_id", "KeyType": "HASH"},
            {"AttributeName": "review_sort", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "product_id", "AttributeType": "S"},
            {"AttributeName": "review_sort", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "GSI1-UserReviews",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                    {"AttributeName": "review_sort", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
            }
        ],
    },
]


def ensure_tables_exist() -> None:
    """Creates all 8 DynamoDB tables with GSIs if they do not already exist."""
    global _initialized
    if _initialized:
        return
    client = get_dynamodb_client()
    existing = set(client.list_tables().get("TableNames", []))

    for spec in TABLE_DEFINITIONS:
        t_name = settings.table_name(spec["entity"])
        if t_name in existing:
            continue
        create_kwargs = {
            "TableName": t_name,
            "KeySchema": spec["KeySchema"],
            "AttributeDefinitions": spec["AttributeDefinitions"],
            "ProvisionedThroughput": {"ReadCapacityUnits": 2, "WriteCapacityUnits": 2},
        }
        if "GlobalSecondaryIndexes" in spec:
            create_kwargs["GlobalSecondaryIndexes"] = spec["GlobalSecondaryIndexes"]
        try:
            client.create_table(**create_kwargs)
            logger.info(f"Created DynamoDB table: {t_name}")
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "ResourceInUseException":
                raise
    _initialized = True

