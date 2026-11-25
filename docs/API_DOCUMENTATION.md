# LensCart — REST API Documentation

All endpoints return a consistent JSON envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

## 1. Authentication (`app/routers/auth_router.py`)
- `POST /auth/register` — Register customer in Cognito (`customers` group). Never accepts admin role from client.
- `POST /auth/confirm-signup` — Confirm email verification code with Cognito.
- `POST /auth/login` — Authenticate via Cognito `USER_PASSWORD_AUTH` and return `access_token`, `id_token`, `refresh_token`.
- `POST /auth/refresh` — Exchange `refresh_token` via `REFRESH_TOKEN_AUTH`.
- `POST /auth/logout` — Revoke session via Cognito `global_sign_out`.
- `POST /auth/forgot-password` — Initiate Cognito password recovery code.
- `POST /auth/reset-password` — Confirm password reset with verification code.
- `GET /auth/me` — Verify Bearer JWT (`RS256` JWKS in production) and return user profile.

## 2. Products & Categories (`product_router.py`, `category_router.py`, `review_router.py`)
- `GET /categories` — List all 8 photography categories with product counts.
- `GET /categories/{category_id}` — Get category details and products via `GSI1-CategoryPrice`.
- `GET /products` — Filter by `q`, `category_id`, `brand`, `lens_mount`, `min_price`, `max_price`, `min_rating`, `in_stock_only`, `sort_by`, `page`, `page_size`.
- `GET /products/{product_id}` — Get product details, resolved S3/CloudFront media URLs, stock status, and compatible gear.
- `GET /products/{product_id}/compatibility` — Query `GSI3-LensMount` for compatible lenses and accessories.
- `POST /products/compare` — Side-by-side specification comparison matrix for 2–4 products.
- `GET /products/{product_id}/reviews` & `POST /products/{product_id}/reviews` — Product reviews.

## 3. Cart, Wishlist, Addresses & Orders (`cart_router.py`, `wishlist_router.py`, `address_router.py`, `order_router.py`)
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{item_id}`, `DELETE /cart/items/{item_id}`
- `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/{product_id}`
- `GET /profile/addresses`, `POST /profile/addresses`, `DELETE /profile/addresses/{address_id}`
- `POST /orders`, `GET /orders`, `GET /orders/{order_id}`, `POST /orders/{order_id}/cancel`

## 4. Admin & Inventory (`admin_router.py`, `inventory_router.py`)
- `GET /admin/dashboard` — Executive KPIs, Recharts daily/monthly revenue series, and category performance.
- `POST /admin/products/upload-url` — Generate S3 presigned PUT URL (MIME & 5MB size validated).
- `POST /admin/products/delete-image` — Delete product image object from S3 media bucket.
- `POST /admin/products`, `PATCH /admin/products/{product_id}`, `DELETE /admin/products/{product_id}`
- `GET /admin/inventory`, `POST /admin/inventory/{product_id}/adjust`, `GET /admin/inventory/{product_id}/logs`
- `GET /admin/orders`, `PATCH /admin/orders/{order_id}`
- `GET /admin/customers`, `PATCH /admin/customers/{user_id}/status`
- `DELETE /admin/reviews/{product_id}/{review_sort}`

