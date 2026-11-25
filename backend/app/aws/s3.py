from pathlib import Path
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
    "image/svg+xml": ".svg",
}

VALID_MEDIA_FOLDERS = {
    "cameras",
    "lenses",
    "tripods",
    "lighting",
    "audio",
    "accessories",
    "storage",
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
        # Enforce private bucket policy (BlockPublicAccess = True)
        s3.put_public_access_block(
            Bucket=settings.S3_MEDIA_BUCKET,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )


def resolve_media_url(key_or_url: str) -> str:
    """
    Resolves a stored S3 object key (e.g. `product_media/cameras/sony-a7rv-1.svg`)
    into a deliverable frontend URL without exposing the private S3 bucket publicly:
      1. If already a full URL or `/media/` path, returns it unchanged.
      2. If `CLOUDFRONT_MEDIA_DOMAIN` is configured, returns the CloudFront OAC HTTPS URL.
      3. If `USE_LOCAL_AWS=True`, returns `/media/{object_key}` served by the local media route.
      4. In AWS production without a separate CloudFront media domain, generates a short-lived
         S3 Presigned GET URL (1 hour expiry).
    """
    if not key_or_url:
        return ""
    cleaned = key_or_url.strip()
    if cleaned.startswith(("http://", "https://", "/media/", "data:")):
        return cleaned

    normalized_key = cleaned.lstrip("/")
    if settings.CLOUDFRONT_MEDIA_DOMAIN:
        domain = settings.CLOUDFRONT_MEDIA_DOMAIN.rstrip("/").replace("https://", "").replace("http://", "")
        return f"https://{domain}/{normalized_key}"

    if settings.USE_LOCAL_AWS:
        return f"/media/{normalized_key}"

    s3 = get_s3_client()
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": settings.S3_MEDIA_BUCKET, "Key": normalized_key},
        ExpiresIn=3600,
    )


def generate_presigned_image_upload(
    filename: str,
    content_type: str,
    file_size_bytes: int,
    category_folder: str = "cameras",
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

    folder = category_folder.strip().lower()
    if folder not in VALID_MEDIA_FOLDERS:
        folder = "cameras"

    safe_stem = re.sub(r"[^a-zA-Z0-9_-]", "-", filename.rsplit(".", 1)[0])[:40]
    ext = ALLOWED_IMAGE_CONTENT_TYPES[content_type]
    object_key = f"product_media/{folder}/{uuid.uuid4().hex[:12]}-{safe_stem}{ext}"

    if settings.USE_LOCAL_AWS:
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
    delivery_url = resolve_media_url(object_key)

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "delivery_url": delivery_url,
        "public_asset_url": delivery_url,
        "expires_in": 300,
    }


def upload_file_to_media_bucket(
    local_path: Path, object_key: str, content_type: str = "image/svg+xml"
) -> str:
    """Uploads a local product media file into the private S3 media bucket."""
    if settings.USE_LOCAL_AWS:
        ensure_media_bucket_exists()
    s3 = get_s3_client()
    normalized_key = object_key.lstrip("/")
    s3.put_object(
        Bucket=settings.S3_MEDIA_BUCKET,
        Key=normalized_key,
        Body=local_path.read_bytes(),
        ContentType=content_type,
    )
    return normalized_key


def delete_product_image(object_key: str) -> bool:
    """Deletes a product image object from the private S3 media bucket."""
    if not object_key:
        return False
    normalized_key = object_key.lstrip("/")
    if normalized_key.startswith("media/"):
        normalized_key = normalized_key[len("media/") :]
    if settings.USE_LOCAL_AWS:
        ensure_media_bucket_exists()
    s3 = get_s3_client()
    s3.delete_object(Bucket=settings.S3_MEDIA_BUCKET, Key=normalized_key)
    return True
