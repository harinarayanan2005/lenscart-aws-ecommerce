# LensCart — REST API Reference & Environment Variables

## 1. Standard Response Envelope
Every endpoint returns JSON with a `success` boolean:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "page_size": 12,
    "total": 14,
    "total_pages": 2
  }
}
```
Errors return standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `413`, `422`, `500`):
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock.",
    "details": { "product_id": "PROD#cam-nikon-z8", "available": 4, "requested": 6 }
  }
}
```

---

## 2. Endpoint Summary

### Authentication & Profile
- `POST /auth/login` — Authenticate with email & password, returns Cognito-compatible JWT `access_token`, `id_token`, and `user`.
- `POST /auth/register` — Register new customer account (`Customer` group).
- `POST /auth/forgot-password` — Initiate password reset code.
- `POST /auth/reset-password` — Confirm password reset with verification code.
- `GET /auth/me` — Verify Bearer JWT and return current user profile.
- `GET /profile/addresses` — List authenticated customer's delivery addresses.
- `POST /profile/addresses` — Save a new delivery address.
- `DELETE /profile/addresses/{address_id}` — Remove a saved address.

### Products, Categories, Compatibility & Reviews
- `GET /categories` — List all 8 photography categories with active item counts.
- `GET /categories/{category_id}` — Category details + products in category.
- `GET /products` — Filterable, sortable, paginated product catalogue (`q`, `category_id`, `brand`, `lens_mount`, `min_price`, `max_price`, `min_rating`, `in_stock_only`, `featured`, `is_new_arrival`, `is_best_seller`, `on_sale`, `sort_by`, `page`, `page_size`).
- `GET /products/{product_id}` — Full product details, specs, stock, and compatible products.
- `GET /products/{product_id}/compatibility` — Resolve native-mount lenses and compatible accessories via `GSI3-LensMount`.
- `POST /products/compare` — Compare 2–4 products side by side across all technical specifications.
- `GET /products/{product_id}/reviews` — List verified reviews for a product.
- `POST /products/{product_id}/reviews` — Submit a customer review (authenticated `Customer`).

### Shopping Cart & Wishlist
- `GET /cart` — Retrieve cart enriched with live prices, discounts, tax, shipping, and stock validation.
- `POST /cart/items` — Add product to cart with live stock check.
- `PATCH /cart/items/{item_id}` — Update item quantity or remove if `0`.
- `DELETE /cart/items/{item_id}` — Remove item from cart.
- `GET /wishlist` — List saved wishlist items.
- `POST /wishlist` — Add product to wishlist.
- `DELETE /wishlist/{product_id}` — Remove product from wishlist.

### Orders
- `POST /orders` — Place order with atomic stock reservation, idempotency check, simulated payment, and SQS asynchronous processing.
- `GET /orders` — List customer's orders (`GSI1-UserOrders`).
- `GET /orders/{order_id}` — Order details & status timeline (enforces customer ownership).
- `POST /orders/{order_id}/cancel` — Cancel eligible order (`Placed`, `Confirmed`, `Processing`) and atomically restore reserved stock.

### Administrator Portal (`Admin` Role Required)
- `GET /admin/dashboard` — KPI metrics, daily/monthly sales series, category performance, low-stock alerts, and recent orders.
- `POST /admin/products` — Create product and initialize warehouse stock record.
- `PATCH /admin/products/{product_id}` — Update product pricing, discounts, or technical specifications.
- `DELETE /admin/products/{product_id}` — Deactivate product (`catalog_status = "INACTIVE"`).
- `POST /admin/products/upload-url` — Generate restricted S3 Presigned `PUT` URL (`<= 5 MB`, `image/jpeg|png|webp`).
- `GET /admin/orders` — List and filter all customer orders.
- `PATCH /admin/orders/{order_id}` — Transition order status and publish SNS notification.
- `GET /admin/inventory` — List all inventory records, alert statuses, and movement logs.
- `POST /admin/inventory/{product_id}/adjust` — Perform audited stock adjustment (`delta`, `reason`).
- `GET /admin/customers` — List customer accounts with order counts and lifetime spend.
- `PATCH /admin/customers/{user_id}/status` — Update customer status (`ACTIVE` / `SUSPENDED`).

---

## 3. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Default | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | `development` or `production` |
| `AWS_REGION` | `us-east-1` | Target AWS Region |
| `USE_LOCAL_AWS` | `true` | Uses Moto in-process AWS emulation when `true`; live AWS when `false` |
| `TABLE_PREFIX` | `lenscart` | Prefix for all 8 DynamoDB tables |
| `COGNITO_USER_POOL_ID` | `us-east-1_LensCartPool` | Amazon Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | `lenscart-web-client` | Amazon Cognito App Client ID |
| `S3_MEDIA_BUCKET` | `lenscart-product-media-private` | Private S3 bucket for product images |
| `MAX_UPLOAD_SIZE_BYTES` | `5242880` | 5 MB limit for presigned uploads |
| `SQS_ORDER_QUEUE_URL` | `...` | SQS queue URL for order events |
| `SNS_ORDER_TOPIC_ARN` | `...` | SNS topic ARN for notifications |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed CORS origins |

### Frontend (`frontend/.env.local`)
| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | AWS Lambda Function URL or local FastAPI URL |
| `VITE_AWS_REGION` | `us-east-1` | AWS Region |
| `VITE_COGNITO_USER_POOL_ID` | `us-east-1_LensCartPool` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | `lenscart-web-client` | Cognito App Client ID |

