"""
LensCart S3 Product Media Generator & Uploader Script.
1. Generates authorized studio SVG product photography under `product_media/{cameras,lenses,tripods,lighting,audio,accessories,storage}/`
   if not already present on disk (never deletes original files).
2. Uploads all `product_media/` assets to the configured private S3 media bucket (`S3_MEDIA_BUCKET`).
3. Updates DynamoDB product & category records with S3 object keys (`product_media/<folder>/<file>.svg`).
"""

from pathlib import Path
from typing import Dict, List
from app.aws.dynamodb import ensure_tables_exist
from app.aws.s3 import ensure_media_bucket_exists, upload_file_to_media_bucket
from app.config import PRODUCT_MEDIA_ROOT, settings
from app.repositories.category_repo import CategoryRepository
from app.repositories.product_repo import ProductRepository
from app.utils.logger import logger

CATEGORY_TO_MEDIA_FOLDER: Dict[str, str] = {
    "cameras": "cameras",
    "lenses": "lenses",
    "tripods": "tripods",
    "lighting": "lighting",
    "audio": "audio",
    "accessories": "accessories",
    "storage": "storage",
    "bags": "accessories",
}


def _render_studio_product_svg(
    title: str,
    brand: str,
    category_folder: str,
    subtitle: str,
    view_label: str = "STUDIO FRONT PROFILE",
    accent_hex: str = "#c89d54",
) -> str:
    safe_title = (
        title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    )
    safe_brand = brand.upper().replace("&", "&amp;")
    safe_sub = (
        subtitle.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")[:68]
    )

    if category_folder == "cameras":
        center_graphic = f"""
        <rect x="240" y="165" width="320" height="210" rx="22" fill="#1b1f27" stroke="{accent_hex}" stroke-width="3"/>
        <path d="M325 165 L350 128 L450 128 L475 165 Z" fill="#232833" stroke="{accent_hex}" stroke-width="2.5"/>
        <rect x="255" y="180" width="46" height="180" rx="12" fill="#13161c" stroke="#343b48" stroke-width="1.5"/>
        <circle cx="415" cy="270" r="78" fill="#11141a" stroke="{accent_hex}" stroke-width="3.5"/>
        <circle cx="415" cy="270" r="56" fill="#181d26" stroke="#495366" stroke-width="2"/>
        <circle cx="415" cy="270" r="32" fill="#0d1015" stroke="{accent_hex}" stroke-width="1.5"/>
        <circle cx="398" cy="252" r="8" fill="{accent_hex}" fill-opacity="0.45"/>
        <circle cx="515" cy="198" r="9" fill="#d9534f"/>
        """
    elif category_folder == "lenses":
        center_graphic = f"""
        <rect x="275" y="135" width="250" height="260" rx="18" fill="#181c24" stroke="{accent_hex}" stroke-width="3"/>
        <line x1="275" y1="185" x2="525" y2="185" stroke="{accent_hex}" stroke-width="2.5"/>
        <line x1="275" y1="235" x2="525" y2="235" stroke="#394150" stroke-width="6" stroke-dasharray="6,6"/>
        <line x1="275" y1="305" x2="525" y2="305" stroke="#394150" stroke-width="6" stroke-dasharray="6,6"/>
        <circle cx="400" cy="268" r="64" fill="#101319" stroke="{accent_hex}" stroke-width="3"/>
        <circle cx="400" cy="268" r="38" fill="#1a2130" stroke="#5c6b84" stroke-width="2"/>
        """
    elif category_folder == "tripods":
        center_graphic = f"""
        <rect x="365" y="125" width="70" height="48" rx="8" fill="#1f242e" stroke="{accent_hex}" stroke-width="2.5"/>
        <line x1="400" y1="173" x2="400" y2="260" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
        <line x1="388" y1="235" x2="275" y2="395" stroke="{accent_hex}" stroke-width="9" stroke-linecap="round"/>
        <line x1="412" y1="235" x2="525" y2="395" stroke="{accent_hex}" stroke-width="9" stroke-linecap="round"/>
        <line x1="400" y1="235" x2="400" y2="400" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
        """
    elif category_folder == "lighting":
        center_graphic = f"""
        <polygon points="290,150 510,150 555,345 245,345" fill="#1b2029" stroke="{accent_hex}" stroke-width="3"/>
        <circle cx="400" cy="248" r="62" fill="#fffbeb" fill-opacity="0.18" stroke="{accent_hex}" stroke-width="3"/>
        <circle cx="400" cy="248" r="32" fill="{accent_hex}" fill-opacity="0.75"/>
        <line x1="400" y1="345" x2="400" y2="405" stroke="#94a3b8" stroke-width="8"/>
        """
    elif category_folder == "audio":
        center_graphic = f"""
        <rect x="355" y="125" width="90" height="175" rx="45" fill="#1c212b" stroke="{accent_hex}" stroke-width="3"/>
        <line x1="365" y1="175" x2="435" y2="175" stroke="#475569" stroke-width="3"/>
        <line x1="365" y1="205" x2="435" y2="205" stroke="#475569" stroke-width="3"/>
        <line x1="365" y1="235" x2="435" y2="235" stroke="#475569" stroke-width="3"/>
        <path d="M325 245 A75 75 0 0 0 475 245" fill="none" stroke="{accent_hex}" stroke-width="4"/>
        <line x1="400" y1="320" x2="400" y2="395" stroke="{accent_hex}" stroke-width="6"/>
        """
    elif category_folder == "storage":
        center_graphic = f"""
        <rect x="290" y="135" width="220" height="255" rx="18" fill="#191e28" stroke="{accent_hex}" stroke-width="3"/>
        <rect x="320" y="165" width="160" height="85" rx="8" fill="#11151d" stroke="#334155" stroke-width="2"/>
        <text x="400" y="218" text-anchor="middle" fill="{accent_hex}" font-family="monospace" font-size="24" font-weight="700">PRO CFX / SSD</text>
        <rect x="335" y="295" width="130" height="55" rx="6" fill="{accent_hex}" fill-opacity="0.2" stroke="{accent_hex}" stroke-width="1.5"/>
        """
    else:
        center_graphic = f"""
        <rect x="265" y="145" width="270" height="235" rx="24" fill="#1a1f29" stroke="{accent_hex}" stroke-width="3"/>
        <rect x="305" y="185" width="190" height="155" rx="14" fill="#12161e" stroke="#475569" stroke-width="2"/>
        <circle cx="400" cy="262" r="46" fill="none" stroke="{accent_hex}" stroke-width="3" stroke-dasharray="10,6"/>
        """

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f1217"/>
      <stop offset="55%" stop-color="#171b23"/>
      <stop offset="100%" stop-color="#0c0e12"/>
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="44%" r="48%">
      <stop offset="0%" stop-color="{accent_hex}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="{accent_hex}" stop-opacity="0.0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bgGrad)"/>
  <circle cx="400" cy="260" r="260" fill="url(#glowGrad)"/>
  <rect x="32" y="28" width="736" height="544" rx="18" fill="none" stroke="#262c38" stroke-width="1.5"/>
  <text x="64" y="68" fill="{accent_hex}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="3">{safe_brand} // LENSCART AUTHORIZED MEDIA</text>
  <text x="736" y="68" text-anchor="end" fill="#8b95a7" font-family="monospace" font-size="12" letter-spacing="1.5">{view_label}</text>
  {center_graphic}
  <text x="400" y="472" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">{safe_title}</text>
  <text x="400" y="504" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="14">{safe_sub}</text>
  <line x1="330" y1="530" x2="470" y2="530" stroke="{accent_hex}" stroke-width="2" stroke-opacity="0.6"/>
</svg>
"""


def get_product_s3_keys(product: Dict) -> List[str]:
    folder = CATEGORY_TO_MEDIA_FOLDER.get(product.get("category_slug", "cameras"), "cameras")
    slug = product["slug"]
    jpg_1 = PRODUCT_MEDIA_ROOT / folder / f"{slug}-1.jpg"
    jpg_2 = PRODUCT_MEDIA_ROOT / folder / f"{slug}-2.jpg"
    ext_1 = "jpg" if jpg_1.is_file() else "svg"
    ext_2 = "jpg" if jpg_2.is_file() else "svg"
    return [
        f"product_media/{folder}/{slug}-1.{ext_1}",
        f"product_media/{folder}/{slug}-2.{ext_2}",
    ]


def get_category_s3_key(category: Dict) -> str:
    folder = CATEGORY_TO_MEDIA_FOLDER.get(category.get("slug", "cameras"), "cameras")
    slug = category["slug"]
    jpg_path = PRODUCT_MEDIA_ROOT / folder / f"category-{slug}.jpg"
    ext = "jpg" if jpg_path.is_file() else "svg"
    return f"product_media/{folder}/category-{slug}.{ext}"


def ensure_local_product_media_files(categories: List[Dict], products: List[Dict]) -> int:
    """
    Ensures all required folder structures and studio SVG files exist in `product_media/`.
    Does not delete or overwrite existing verified image files unless missing.
    """
    created_count = 0
    for folder in set(CATEGORY_TO_MEDIA_FOLDER.values()):
        (PRODUCT_MEDIA_ROOT / folder).mkdir(parents=True, exist_ok=True)

    for cat in categories:
        rel_key = get_category_s3_key(cat)
        target_path = PRODUCT_MEDIA_ROOT.parent / rel_key
        if not target_path.exists():
            folder = CATEGORY_TO_MEDIA_FOLDER.get(cat["slug"], "cameras")
            svg = _render_studio_product_svg(
                title=cat["name"],
                brand="LENSCART CATALOGUE",
                category_folder=folder,
                subtitle=cat.get("description", ""),
                view_label="CATEGORY COLLECTION",
            )
            target_path.write_text(svg, encoding="utf-8")
            created_count += 1

    for prod in products:
        folder = CATEGORY_TO_MEDIA_FOLDER.get(prod.get("category_slug", "cameras"), "cameras")
        keys = get_product_s3_keys(prod)
        mount_or_spec = prod.get("lens_mount") or prod.get("category_name", "Optical Gear")
        for idx, rel_key in enumerate(keys, start=1):
            target_path = PRODUCT_MEDIA_ROOT.parent / rel_key
            if not target_path.exists():
                svg = _render_studio_product_svg(
                    title=prod["name"],
                    brand=prod["brand"],
                    category_folder=folder,
                    subtitle=f"{prod['sku']} • {mount_or_spec} • {prod.get('short_description', '')}",
                    view_label="STUDIO FRONT PROFILE" if idx == 1 else "OPTICAL & MOUNT DETAIL",
                    accent_hex="#c89d54" if idx == 1 else "#60a5fa",
                )
                target_path.write_text(svg, encoding="utf-8")
                created_count += 1

    return created_count


def upload_all_product_media_to_s3(update_dynamodb: bool = True) -> Dict[str, int]:
    """
    Uploads all files in `product_media/` to the private S3 media bucket (`S3_MEDIA_BUCKET`)
    and updates DynamoDB product & category records to reference the S3 object keys.
    """
    from scripts.seed_data import CATEGORIES_SEED, PRODUCTS_SEED

    ensure_local_product_media_files(CATEGORIES_SEED, PRODUCTS_SEED)
    if settings.USE_LOCAL_AWS:
        ensure_media_bucket_exists()
        ensure_tables_exist()

    uploaded_files = 0
    for file_path in PRODUCT_MEDIA_ROOT.rglob("*"):
        if not file_path.is_file():
            continue
        rel_key = f"product_media/{file_path.relative_to(PRODUCT_MEDIA_ROOT).as_posix()}"
        mime = {
            ".svg": "image/svg+xml",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }.get(file_path.suffix.lower(), "application/octet-stream")
        upload_file_to_media_bucket(file_path, rel_key, content_type=mime)
        uploaded_files += 1

    updated_products = 0
    if update_dynamodb:
        prod_repo = ProductRepository()
        cat_repo = CategoryRepository()
        for c in CATEGORIES_SEED:
            key = get_category_s3_key(c)
            existing_c = cat_repo.get_by_id(c["category_id"])
            if existing_c:
                existing_c["hero_image"] = key
                existing_c["image"] = key
                cat_repo.put_category(existing_c)
        for p in PRODUCTS_SEED:
            keys = get_product_s3_keys(p)
            existing_p = prod_repo.get_by_id(p["product_id"])
            if existing_p:
                prod_repo.update_product(
                    p["product_id"],
                    {"images": keys, "thumbnail_image": keys[0]},
                )
                updated_products += 1

    logger.info(
        f"Uploaded {uploaded_files} media objects to S3 bucket '{settings.S3_MEDIA_BUCKET}' and updated {updated_products} products."
    )
    return {"uploaded_files": uploaded_files, "updated_products": updated_products}


if __name__ == "__main__":
    summary = upload_all_product_media_to_s3(update_dynamodb=True)
    print(f"S3 Media Migration Complete: {summary}")

