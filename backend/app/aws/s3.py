import re
import uuid
import boto3
from botocore.exceptions import ClientError
from fastapi import status
from app.aws.dynamodb import ensure_local_aws_mock
from app.config import settings
from app.middleware.security import AppError

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def get_s3_client():
    ensure_local_aws_mock()
    return boto3.client("s3", region_name=settings.AWS_REGION)


def ensure_media_bucket_exists() -> None:
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.S3_MEDIA_BUCKET)
    except ClientError:
        if settings.AWS_REGION == "us-east-1":
            s3.create_bucket(Bucket=settings.S3_MEDIA_BUCKET)
        else:
            s3.create_bucket(
                Bucket=settings.S3_MEDIA_BUCKET,
                CreateBucketConfiguration={"LocationConstraint": settings.AWS_REGION},
            )
        # Enforce private bucket policy (block public access)
        s3.put_public_access_block(
            Bucket=settings.S3_MEDIA_BUCKET,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )


def generate_presigned_image_upload(
    filename: str, content_type: str, file_size_bytes: int
) -> dict[str, str | int]:
    """
    Validates file type & size and generates a short-lived S3 presigned PUT URL
    for administrators to upload product photography directly to the private S3 media bucket.
    """
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise AppError(
            "INVALID_FILE_TYPE",
            f"Unsupported image type '{content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_CONTENT_TYPES.keys())}",
            status.HTTP_400_BAD_REQUEST,
        )

    if file_size_bytes <= 0 or file_size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
        raise AppError(
            "FILE_SIZE_EXCEEDED",
            f"File size must be between 1 byte and {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
            status.HTTP_400_BAD_REQUEST,
        )

    safe_stem = re.sub(r"[^a-zA-Z0-9_-]", "-", filename.rsplit(".", 1)[0])[:40]
    ext = ALLOWED_IMAGE_CONTENT_TYPES[content_type]
    object_key = f"products/{uuid.uuid4().hex[:12]}-{safe_stem}{ext}"

    ensure_media_bucket_exists()
    s3 = get_s3_client()
    upload_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.S3_MEDIA_BUCKET,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
    )

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "public_asset_url": f"https://{settings.S3_MEDIA_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{object_key}",
        "expires_in": 300,
    }

