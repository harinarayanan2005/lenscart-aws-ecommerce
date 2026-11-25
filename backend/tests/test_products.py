from tests.conftest import InProcessASGIClient, get_auth_headers


def test_health_and_seeded_categories(client: InProcessASGIClient):
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["data"]["status"] == "healthy"
    assert h.json()["data"]["aws_region"] == "ap-south-1"

    cats = client.get("/categories")
    assert cats.status_code == 200
    cat_list = cats.json()["data"]
    assert len(cat_list) == 8
    slugs = [c["slug"] for c in cat_list]
    for expected in ("cameras", "lenses", "tripods", "lighting", "audio", "accessories", "storage", "bags"):
        assert expected in slugs


def test_product_catalogue_s3_keys_compatibility_and_comparison(client: InProcessASGIClient):
    # Verify products resolve S3 keys (`product_media/...`) and never reference external Unsplash URLs
    res = client.get("/products", params={"category_id": "CAT#lenses", "lens_mount": "Sony E"})
    assert res.status_code == 200
    lenses = res.json()["data"]
    assert len(lenses) >= 2
    for lens in lenses:
        assert lens["lens_mount"] == "Sony E"
        assert all("unsplash.com" not in k for k in lens["image_keys"])
        assert all(k.startswith("product_media/") for k in lens["image_keys"])
        assert all(img.startswith("/media/product_media/") for img in lens["images"])

    # Verify /media/ route serves the actual product image (JPEG photo or SVG studio asset)
    first_media_url = lenses[0]["images"][0]
    media_resp = client.get(first_media_url)
    assert media_resp.status_code == 200
    assert len(media_resp.content) > 500
    content_type = media_resp.headers.get("content-type", "")
    assert "image/jpeg" in content_type or "image/svg+xml" in content_type

    # Check camera-lens compatibility endpoint
    compat = client.get("/products/PROD%23cam-sony-a7rv/compatibility")
    assert compat.status_code == 200
    compat_data = compat.json()["data"]
    assert compat_data["lens_mount"] == "Sony E"
    compat_lens_ids = [l["product_id"] for l in compat_data["compatible_lenses"]]
    assert "PROD#lens-sony-2470gm2" in compat_lens_ids
    assert "PROD#lens-sigma-85dgdn" in compat_lens_ids
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


def test_product_reviews_and_moderation(client: InProcessASGIClient):
    cust_headers = get_auth_headers(client, "julian.chen@lenscart.store", "Customer@Lens2026")
    admin_headers = get_auth_headers(client, "admin@lenscart.store", "Admin@Lens2026")

    rev_res = client.post(
        "/products/PROD%23cam-canon-r5mk2/reviews",
        headers=cust_headers,
        json={
            "rating": 5,
            "title": "Outstanding 45MP stacked sensor",
            "comment": "Eye control AF and 8K 60p RAW make this body an incredible hybrid powerhouse.",
        },
    )
    assert rev_res.status_code == 201
    created_rev = rev_res.json()["data"]
    assert created_rev["rating"] == 5

    list_res = client.get("/products/PROD%23cam-canon-r5mk2/reviews")
    assert list_res.status_code == 200
    assert any(r["review_id"] == created_rev["review_id"] for r in list_res.json()["data"])

    # Admin review moderation
    del_res = client.delete(
        f"/admin/reviews/PROD%23cam-canon-r5mk2/{created_rev['review_sort']}",
        headers=admin_headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True

