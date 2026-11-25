from typing import Any, Dict, List, Optional
from fastapi import status
from app.aws.s3 import resolve_media_url
from app.middleware.security import AppError
from app.repositories.category_repo import CategoryRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.order_review_repo import ReviewRepository
from app.repositories.product_repo import ProductRepository
from app.utils.pricing import compute_final_price


class CatalogService:
    def __init__(self) -> None:
        self.cat_repo = CategoryRepository()
        self.prod_repo = ProductRepository()
        self.inv_repo = InventoryRepository()
        self.rev_repo = ReviewRepository()

    def enrich_product_with_stock(self, product: Dict[str, Any]) -> Dict[str, Any]:
        stock = self.inv_repo.get_stock(product["product_id"])
        avail = int(stock["available_qty"]) if stock else 0
        threshold = int(stock.get("low_stock_threshold", 5)) if stock else 5
        price = float(product.get("price", 0))
        disc = float(product.get("discount_percent", 0))

        raw_images: List[str] = list(product.get("images") or [])
        resolved_images = [resolve_media_url(k) for k in raw_images if k]
        raw_thumb = product.get("thumbnail_image") or (raw_images[0] if raw_images else "")
        resolved_thumb = resolve_media_url(raw_thumb) if raw_thumb else ""

        return {
            **product,
            "image_keys": raw_images,
            "images": resolved_images if resolved_images else raw_images,
            "thumbnail_image": resolved_thumb,
            "final_price": compute_final_price(price, disc),
            "available_qty": avail,
            "low_stock_threshold": threshold,
            "in_stock": avail > 0,
        }

    def list_categories(self) -> List[Dict[str, Any]]:
        categories = self.cat_repo.list_all()
        active_products = self.prod_repo.query_active_catalog()
        counts: Dict[str, int] = {}
        for p in active_products:
            cid = p.get("category_id", "")
            counts[cid] = counts.get(cid, 0) + 1
        for c in categories:
            c["product_count"] = counts.get(c["category_id"], 0)
            if c.get("image"):
                c["image"] = resolve_media_url(c["image"])
        return categories

    def get_category_detail(self, category_id_or_slug: str) -> Dict[str, Any]:
        cat = self.cat_repo.get_by_id(category_id_or_slug)
        if not cat:
            cat = self.cat_repo.get_by_slug(category_id_or_slug)
        if not cat:
            raise AppError(
                "CATEGORY_NOT_FOUND",
                f"Category '{category_id_or_slug}' not found.",
                status.HTTP_404_NOT_FOUND,
            )
        if cat.get("image"):
            cat["image"] = resolve_media_url(cat["image"])
        products = self.prod_repo.query_by_category(cat["category_id"])
        enriched = [self.enrich_product_with_stock(p) for p in products]
        return {"category": cat, "products": enriched}

    def query_products(
        self,
        q: Optional[str] = None,
        category_id: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        lens_mount: Optional[str] = None,
        in_stock_only: bool = False,
        featured: Optional[bool] = None,
        is_new_arrival: Optional[bool] = None,
        is_best_seller: Optional[bool] = None,
        on_sale: Optional[bool] = None,
        sort_by: str = "popularity",
        page: int = 1,
        page_size: int = 12,
    ) -> Dict[str, Any]:
        # Choose optimal GSI query based on selective filter (Zero table scans)
        if category_id:
            if not category_id.startswith("CAT#"):
                cat = self.cat_repo.get_by_slug(category_id)
                resolved_cid = cat["category_id"] if cat else f"CAT#{category_id}"
            else:
                resolved_cid = category_id
            raw_products = self.prod_repo.query_by_category(resolved_cid)
        elif lens_mount:
            raw_products = self.prod_repo.query_by_lens_mount(lens_mount)
        else:
            raw_products = self.prod_repo.query_active_catalog()

        enriched = [self.enrich_product_with_stock(p) for p in raw_products]

        # Apply secondary filters
        filtered: List[Dict[str, Any]] = []
        search_lower = q.strip().lower() if q else None
        brand_lower = brand.strip().lower() if brand else None

        for p in enriched:
            if search_lower:
                haystack = " ".join(
                    [
                        str(p.get("name", "")),
                        str(p.get("brand", "")),
                        str(p.get("category_name", "")),
                        str(p.get("short_description", "")),
                        str(p.get("lens_mount", "")),
                        str(p.get("sku", "")),
                    ]
                ).lower()
                if search_lower not in haystack:
                    continue
            if brand_lower and p.get("brand", "").lower() != brand_lower:
                continue
            if lens_mount and p.get("lens_mount") != lens_mount:
                continue
            if min_price is not None and p["final_price"] < min_price:
                continue
            if max_price is not None and p["final_price"] > max_price:
                continue
            if min_rating is not None and float(p.get("rating_avg", 0)) < min_rating:
                continue
            if in_stock_only and not p["in_stock"]:
                continue
            if featured is not None and bool(p.get("is_featured")) != featured:
                continue
            if is_new_arrival is not None and bool(p.get("is_new_arrival")) != is_new_arrival:
                continue
            if is_best_seller is not None and bool(p.get("is_best_seller")) != is_best_seller:
                continue
            if on_sale and float(p.get("discount_percent", 0)) <= 0:
                continue
            filtered.append(p)

        # Sorting
        if sort_by == "price_asc":
            filtered.sort(key=lambda x: x["final_price"])
        elif sort_by == "price_desc":
            filtered.sort(key=lambda x: x["final_price"], reverse=True)
        elif sort_by == "rating":
            filtered.sort(key=lambda x: (x.get("rating_avg", 0), x.get("review_count", 0)), reverse=True)
        elif sort_by == "newest":
            filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        else:
            filtered.sort(key=lambda x: x.get("popularity_score", 0), reverse=True)

        total = len(filtered)
        page = max(1, page)
        page_size = max(1, min(50, page_size))
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        paged_items = filtered[start : start + page_size]

        return {
            "items": paged_items,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        }

    def get_product_detail(self, product_id: str) -> Dict[str, Any]:
        prod = self.prod_repo.get_by_id(product_id)
        if not prod or prod.get("catalog_status") == "INACTIVE":
            raise AppError(
                "PRODUCT_NOT_FOUND",
                f"Product '{product_id}' was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        enriched = self.enrich_product_with_stock(prod)
        compat_ids = prod.get("compatible_product_ids", [])
        compatible_products: List[Dict[str, Any]] = []
        for cid in compat_ids:
            cp = self.prod_repo.get_by_id(cid)
            if cp and cp.get("catalog_status") == "ACTIVE":
                compatible_products.append(self.enrich_product_with_stock(cp))
        return {"product": enriched, "compatible_products": compatible_products}

    def check_mount_compatibility(self, product_id: str) -> Dict[str, Any]:
        """
        Resolves genuine camera-to-lens compatibility using structured `lens_mount`
        attributes indexed on `GSI3-LensMount`. Never invents arbitrary compatibility.
        """
        source = self.prod_repo.get_by_id(product_id)
        if not source:
            raise AppError(
                "PRODUCT_NOT_FOUND",
                f"Product '{product_id}' not found.",
                status.HTTP_404_NOT_FOUND,
            )
        mount = (
            source.get("lens_mount")
            or source.get("specifications", {}).get("lens_mount")
            or "Universal"
        )
        same_mount = self.prod_repo.query_by_lens_mount(mount)
        universal_items = (
            self.prod_repo.query_by_lens_mount("Universal") if mount != "Universal" else []
        )

        compatible_lenses: List[Dict[str, Any]] = []
        compatible_accessories: List[Dict[str, Any]] = []

        for item in same_mount:
            if item["product_id"] == product_id:
                continue
            enriched = self.enrich_product_with_stock(item)
            if item.get("category_id") == "CAT#lenses" or item.get("category_slug") == "lenses":
                compatible_lenses.append(enriched)
            elif item.get("category_id") != "CAT#cameras":
                compatible_accessories.append(enriched)

        for item in universal_items:
            if item["product_id"] == product_id:
                continue
            if item["product_id"] in source.get("compatible_product_ids", []) or item.get(
                "category_slug"
            ) in ("tripods", "audio", "bags", "storage"):
                compatible_accessories.append(self.enrich_product_with_stock(item))

        return {
            "source_product": self.enrich_product_with_stock(source),
            "lens_mount": mount,
            "compatible_lenses": compatible_lenses,
            "compatible_accessories": compatible_accessories,
        }

    def compare_products(self, product_ids: List[str]) -> Dict[str, Any]:
        products: List[Dict[str, Any]] = []
        seen = set()
        for pid in product_ids:
            if pid in seen:
                continue
            seen.add(pid)
            p = self.prod_repo.get_by_id(pid)
            if not p:
                raise AppError(
                    "PRODUCT_NOT_FOUND",
                    f"Compared product '{pid}' not found.",
                    status.HTTP_404_NOT_FOUND,
                )
            products.append(self.enrich_product_with_stock(p))

        if len(products) < 2:
            raise AppError(
                "COMPARE_MIN_ITEMS",
                "Please select at least 2 distinct products to compare.",
                status.HTTP_400_BAD_REQUEST,
            )

        spec_keys: List[str] = []
        for p in products:
            for k in p.get("specifications", {}).keys():
                if k not in spec_keys:
                    spec_keys.append(k)

        comparison_matrix: Dict[str, Dict[str, Any]] = {}
        for key in spec_keys:
            comparison_matrix[key] = {}
            for p in products:
                val = p.get("specifications", {}).get(key, "—")
                comparison_matrix[key][p["product_id"]] = val

        return {
            "products": products,
            "spec_keys": spec_keys,
            "comparison_matrix": comparison_matrix,
        }

    def list_reviews(self, product_id: str) -> List[Dict[str, Any]]:
        return self.rev_repo.list_for_product(product_id)

    def add_review(
        self,
        product_id: str,
        user_sub: str,
        user_name: str,
        rating: int,
        title: str,
        comment: str,
    ) -> Dict[str, Any]:
        prod = self.prod_repo.get_by_id(product_id)
        if not prod:
            raise AppError("PRODUCT_NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)

        existing_reviews = self.rev_repo.list_for_product(product_id)
        for r in existing_reviews:
            if r.get("user_id") == f"USER#{user_sub}":
                raise AppError(
                    "DUPLICATE_REVIEW",
                    "You have already submitted a review for this product.",
                    status.HTTP_409_CONFLICT,
                )

        review = self.rev_repo.create_review(
            product_id=product_id,
            user_sub=user_sub,
            user_name=user_name,
            rating=rating,
            title=title,
            comment=comment,
        )

        # Recompute aggregate rating
        all_reviews = [review] + existing_reviews
        avg = round(sum(int(r["rating"]) for r in all_reviews) / len(all_reviews), 1)
        self.prod_repo.update_product(
            product_id,
            {"rating_avg": avg, "review_count": len(all_reviews)},
        )
        return review


catalog_service = CatalogService()
