# LensCart — System Architecture & Technical Design Blueprint

**Project:** LensCart – Photography Equipment & Accessories E-Commerce Platform  
**Workspace Root:** [d:/PROJECTS/lenscart](file:///d:/PROJECTS/lenscart)  

---

## 1. Requirements Analysis & Architectural Overview

**LensCart** is a production-grade, full-stack photography and videography equipment e-commerce platform engineered for the **AWS Free Account Plan** using a 100% serverless, zero-idle-cost architecture.

### Core Architectural Principles
1. **Strict Serverless & Zero Paid Dependencies:** No EC2, RDS, NAT Gateways, Application Load Balancers, or paid custom domains. Initial backend exposure uses **AWS Lambda Function URLs** (included under AWS Lambda's Always Free tier) instead of API Gateway, avoiding API Gateway's 12-month trial expiration cliff.
2. **Zero-Trust Backend Validation:** The frontend never dictates prices, discounts, stock availability, tax/shipping totals, or user identity. Every mutation re-computes prices from DynamoDB, verifies stock via conditional expressions/transactions, and extracts `sub` and `cognito:groups` from cryptographically verified Cognito JWT tokens.
3. **No Routine Table Scans (`Scan` Prohibited):** All data access patterns use DynamoDB `Query`, `GetItem`, `BatchGetItem`, and `TransactWriteItems` across carefully designed Partition Keys (`PK`), Sort Keys (`SK`), and Global Secondary Indexes (`GSI1`, `GSI2`, `GSI3`).
4. **Local-First & Cloud-Ready Parity:** Every AWS integration (`DynamoDB`, `Cognito`, `S3 Presigned URLs`, `SQS`, `SNS`, `EventBridge`) is abstracted behind environment-configurable adapters so the entire stack can run locally in development/testing (using DynamoDB Local / Moto / Local Mode with deterministic Cognito JWT verification) and deploy unchanged via AWS SAM (`template.yaml`) upon explicit approval.

---

## 2. System Architecture & AWS Integration

```mermaid
flowchart TB
    subgraph Client["Client Layer (Browser)"]
        UI["React 18 + TypeScript + Vite SPA<br/>(Redux Toolkit, Bootstrap 5 + Custom Design Tokens)"]
    end

    subgraph Edge["Frontend Delivery & Media Storage"]
        CF["Amazon CloudFront (HTTPS CDN)<br/>Always Free: 1 TB Out / 10M Req/mo"]
        S3Web["Amazon S3 (Frontend Assets Bucket)<br/>Private + CloudFront OAC"]
        S3Media["Amazon S3 (Product Media Bucket)<br/>Private + Presigned PUT/GET URLs"]
    end

    subgraph Auth["Identity & Access Management"]
        Cognito["Amazon Cognito User Pool (Lite Tier)<br/>Always Free: 10,000 MAUs<br/>Groups: Customer, Admin"]
    end

    subgraph Compute["Serverless Backend Layer (AWS Lambda + FastAPI + Mangum)"]
        FnURL["AWS Lambda Function URL (HTTPS + CORS)<br/>Modular FastAPI Router Dispatch"]
        APILambda["Core API Lambda Function<br/>(Products, Cart, Wishlist, Orders, Reviews, Admin)"]
        OrderWorker["Background Order Worker Lambda<br/>(Idempotent Async Order & Notification Processor)"]
        ScheduledWorker["Scheduled Maintenance Lambda<br/>(Low-Stock Audit, Stale Order Check, Delivery Sim)"]
    end

    subgraph Data["Persistence Layer (Amazon DynamoDB - Always Free 25 GB)"]
        DDB[("Amazon DynamoDB Tables<br/>Products, Categories, Carts, Orders,<br/>Inventory, Wishlists, Reviews, Addresses")]
    end

    subgraph Messaging["Event-Driven & Notification Layer"]
        SQS["Amazon SQS (OrderQueue + DLQ)<br/>Always Free: 1M Requests/mo"]
        SNS["Amazon SNS (OrderEventsTopic)<br/>Always Free: 1M Publishes/mo"]
        EB["Amazon EventBridge Scheduler<br/>Low-frequency Cron (1x/24h)"]
    end

    subgraph Observability["Security & Monitoring"]
        CW["Amazon CloudWatch Logs & Metrics<br/>Retention: 3 Days (Cost-Controlled)"]
        IAM["AWS IAM Least-Privilege Execution Roles"]
    end

    UI -->|HTTPS Static Assets| CF
    CF -->|Origin Access Control| S3Web
    UI -->|1. Authenticate / Refresh JWT| Cognito
    UI -->|2. REST API + Bearer JWT| FnURL
    UI -->|3. Direct Presigned Image Upload (Admin)| S3Media
    CF -->|Origin Access Control (/media/*)| S3Media

    FnURL --> APILambda
    APILambda -->|Verify JWKS| Cognito
    APILambda -->|Query / GetItem / TransactWriteItems| DDB
    APILambda -->|Generate Presigned PUT URL| S3Media
    APILambda -->|Enqueue Order Created Event| SQS

    SQS -->|Batch Size 1-5 + DLQ Retry| OrderWorker
    OrderWorker -->|Update Order Timeline & Audit| DDB
    OrderWorker -->|Publish Order Status Notification| SNS

    EB -->|Daily Trigger (rate(1 day))| ScheduledWorker
    ScheduledWorker -->|Query Low Stock & Active Shipments| DDB
    ScheduledWorker -->|Publish Low-Stock / Status Alert| SNS

    APILambda -.-> CW
    OrderWorker -.-> CW
    ScheduledWorker -.-> CW
```

### Component Breakdown
* **Frontend Architecture (`React + TypeScript + Vite`):**
  * **Design System:** Minimalist editorial photography aesthetic inspired by Leica, B&H, and Hasselblad. Uses CSS Custom Properties (`--lc-*` tokens) layered over Bootstrap 5 grid/utilities, supporting instant Light/Dark mode switching persisted in `localStorage` and Redux.
  * **State Management (`Redux Toolkit`):** Dedicated slices for `authSlice`, `productSlice`, `cartSlice`, `wishlistSlice`, `comparisonSlice` (up to 4 products side-by-side), `compatibilitySlice` (camera-to-lens mount matcher), and `uiSlice` (theme, toasts, drawers).
  * **Forms & Validation (`React Hook Form + Zod`):** Strict client-side schema validation mirroring backend Pydantic schemas.
  * **Admin Analytics (`Recharts`):** Responsive area, bar, and donut charts for daily/monthly revenue, category distribution, and order funnel metrics.
* **Backend Architecture (`Python 3.12 + FastAPI + Mangum`):**
  * **Layered Clean Architecture:**
    * `routers/`: HTTP route handlers grouped by domain (`auth`, `products`, `categories`, `cart`, `wishlist`, `orders`, `reviews`, `admin`).
    * `schemas/`: Strict Pydantic v2 request/response models with custom validators (including category-specific specification schemas for Cameras, Lenses, Tripods, Lighting, Audio, etc.).
    * `services/`: Pure business logic (pricing/discount calculation, camera-lens mount compatibility matching, transactional order placement, stock reservation, idempotency verification).
    * `repositories/`: DynamoDB data access objects using `boto3.resource('dynamodb')` with zero routine `Scan` calls.
    * `middleware/` & `dependencies/`: Cognito JWKS verifier (`python-jose` / `PyJWT`), RBAC guards (`require_customer`, `require_admin`), request size limiter, and structured JSON error handler.
    * `handlers/`: AWS Lambda entrypoints (`api_handler.py` via Mangum, `sqs_order_worker.py` for asynchronous SQS order processing, `eventbridge_worker.py` for daily low-stock and order progression checks).

---

## 3. Complete Folder Structure

The workspace directory structure has been initialized at [d:/PROJECTS/lenscart](file:///d:/PROJECTS/lenscart):

```text
d:\PROJECTS\lenscart\
├── frontend\                          # React 18 + TypeScript + Vite SPA
│   ├── public\
│   ├── src\
│   │   ├── assets\                    # Curated SVG icons & fallback product imagery
│   │   ├── components\
│   │   │   ├── common\                # ThemeToggle, Pagination, PriceTag, StockBadge, RatingStars, EmptyState
│   │   │   ├── layout\                # Navbar, Footer, CustomerLayout, AdminLayout, ProtectedRoute
│   │   │   ├── products\              # ProductCard, ProductFilterSidebar, SpecTable, ImageGallery, ReviewList
│   │   │   ├── cart\                  # CartDrawer, CartItemRow, OrderSummaryCard
│   │   │   ├── compatibility\         # MountCompatibilityChecker (Camera <-> Lens mount resolver)
│   │   │   ├── comparison\            # ComparisonBar, ComparisonTable
│   │   │   └── admin\                 # StatCard, SalesChart, ProductFormModal, StockAdjustmentModal, ImageUploader
│   │   ├── pages\
│   │   │   ├── customer\              # HomePage, CataloguePage, ProductDetailPage, ComparisonPage,
│   │   │   │                          # CompatibilityPage, CartPage, WishlistPage, CheckoutPage,
│   │   │   │                          # MyOrdersPage, OrderDetailPage, ProfilePage
│   │   │   ├── auth\                  # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   └── admin\                 # AdminDashboardPage, AdminProductsPage, AdminInventoryPage,
│   │   │                              # AdminOrdersPage, AdminCustomersPage, AdminAnalyticsPage
│   │   ├── store\
│   │   │   ├── index.ts               # Redux store configuration
│   │   │   └── slices\                # authSlice, productSlice, cartSlice, wishlistSlice, comparisonSlice, uiSlice
│   │   ├── services\                  # Axios API client with JWT interceptor + domain API modules
│   │   ├── hooks\                     # useAuth, useTheme, useDebounce, useCompatibility
│   │   ├── types\                     # TypeScript interfaces for Products, Specs, Cart, Orders, Admin
│   │   ├── utils\                     # Currency formatters, spec comparators, Zod validation schemas
│   │   └── styles\                    # tokens.css (light/dark design tokens), main.css
│   └── tests\                         # Vitest + React Testing Library component & flow tests
├── backend\                           # Python FastAPI + AWS Lambda Serverless Backend
│   ├── app\
│   │   ├── main.py                    # FastAPI app factory, CORS, exception handlers, router registration
│   │   ├── config.py                  # Pydantic Settings (env-driven, zero hardcoded AWS IDs)
│   │   ├── routers\                   # auth, products, categories, cart, wishlist, orders, reviews, admin
│   │   ├── schemas\                   # Pydantic v2 models (common, product, cart, order, review, address, admin)
│   │   ├── services\                  # product_service, cart_service, order_service, inventory_service, admin_service
│   │   ├── repositories\              # base_repo, product_repo, category_repo, cart_repo, order_repo,
│   │   │                              # inventory_repo, wishlist_repo, review_repo, address_repo, user_repo
│   │   ├── middleware\                # error_handler, request_size_limit, logging_middleware
│   │   ├── dependencies\              # auth.py (Cognito JWT decoder, get_current_user, require_admin)
│   │   ├── handlers\                  # api_handler.py (Mangum), sqs_worker.py, eventbridge_worker.py
│   │   ├── aws\                       # dynamodb.py, s3.py, sqs.py, sns.py, cognito.py
│   │   └── utils\                     # idempotency.py, pricing.py, pagination.py, logger.py
│   ├── scripts\                       # seed_data.py (realistic cameras, lenses, tripods, lighting, etc.)
│   └── tests\
│       ├── unit\                      # Pricing, compatibility, cart calculations, schema validation tests
│       └── integration\               # Moto/DynamoDB repository, RBAC, order transaction, customer isolation tests
├── infrastructure\                    # AWS IaC (Never deployed without explicit user approval)
│   ├── sam\
│   │   └── template.yaml              # AWS SAM template (DynamoDB, Cognito, S3, Lambda URLs, SQS, SNS, EventBridge)
│   └── policies\                      # Least-privilege IAM policy references
└── docs\                              # Comprehensive technical, AWS Free Tier, DB, and API documentation
```

---

## 4. Amazon DynamoDB Data Model Design

To maintain clarity, strict access isolation, and stay well within the **DynamoDB Always Free tier** (25 GB storage, 25 WCU / 25 RCU provisioned across tables or on-demand within free allowances), we design explicit entity structures with **zero routine table scans (`Scan`)**.

### Table & Entity Design Matrix

| Entity / Domain | Partition Key (`PK`) | Sort Key (`SK`) | GSI1 (`GSI1PK` / `GSI1SK`) | GSI2 (`GSI2PK` / `GSI2SK`) | Access Patterns Supported (All via `Query` or `GetItem`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Categories** (`lenscart-categories`) | `tenant_scope` (`"CATALOG"`) | `category_id` (`"CAT#cameras"`) | `GSI1PK`: `slug` (`"cameras"`)<br/>`GSI1SK`: `sort_order` | — | • List all 8 categories sorted (`Query PK="CATALOG"`)<br/>• Get category by ID (`GetItem`) or slug (`Query GSI1`) |
| **2. Products** (`lenscart-products`) | `product_id` (`"PROD#..."`) | `metadata` (`"META"`) | `GSI1PK`: `category_id` (`"CAT#cameras"`)<br/>`GSI1SK`: `price_padded#product_id` | `GSI2PK`: `catalog_status` (`"ACTIVE"`)<br/>`GSI2SK`: `popularity_score#product_id` | • Get product details (`GetItem`)<br/>• Filter by category + price range (`Query GSI1`)<br/>• Browse all active products sorted by popularity/featured (`Query GSI2`)<br/>• Query compatible lenses by mount via `GSI3` (`GSI3PK`: `"MOUNT#Sony E"`, `GSI3SK`: `category_id#price`) |
| **3. Inventory** (`lenscart-inventory`) | `product_id` (`"PROD#..."`) | `record_type` (`"STOCK"` or `"LOG#<iso_ts>#<id>"`) | `GSI1PK`: `stock_alert_status` (`"LOW_STOCK"` / `"OK"`)<br/>`GSI1SK`: `available_qty_padded#product_id` | — | • Check real-time stock (`GetItem PK=product_id, SK="STOCK"`)<br/>• Atomic stock decrement/increment (`UpdateItem` / `TransactWriteItems` with `ConditionExpression: available_qty >= :qty`)<br/>• View stock movement history (`Query PK=product_id, SK begins_with "LOG#"`)<br/>• Admin & EventBridge low-stock alert query (`Query GSI1PK="LOW_STOCK"`) |
| **4. Carts** (`lenscart-carts`) | `user_id` (`"USER#<cognito_sub>"`) | `item_id` (`"ITEM#<product_id>"`) | — | — | • Fetch customer's cart (`Query PK="USER#<sub>"`)<br/>• Add/Update/Remove item (`PutItem` / `UpdateItem` / `DeleteItem` scoped strictly to `USER#<sub>`) |
| **5. Wishlists** (`lenscart-wishlists`) | `user_id` (`"USER#<cognito_sub>"`) | `product_id` (`"PROD#..."`) | — | — | • Fetch customer's wishlist (`Query PK="USER#<sub>"`)<br/>• Add/Remove/Move to cart (`PutItem` / `DeleteItem`) |
| **6. Addresses** (`lenscart-addresses`) | `user_id` (`"USER#<cognito_sub>"`) | `address_id` (`"ADDR#<uuid>"`) | — | — | • Fetch saved addresses (`Query PK="USER#<sub>"`)<br/>• Create/Update/Delete address (`PutItem` / `DeleteItem` scoped to `USER#<sub>`) |
| **7. Orders** (`lenscart-orders`) | `order_id` (`"ORD#<ulid>"`) | `record_type` (`"META"` or `"EVENT#<iso_ts>"`) | `GSI1PK`: `user_id` (`"USER#<cognito_sub>"`)<br/>`GSI1SK`: `created_at#order_id` | `GSI2PK`: `order_status` (`"PLACED"`, `"CONFIRMED"`, etc.)<br/>`GSI2SK`: `created_at#order_id` | • Get order by ID + activity timeline (`Query PK="ORD#<id>"`)<br/>• Customer order history newest-first (`Query GSI1PK="USER#<sub>"`)<br/>• Admin filter orders by status/date (`Query GSI2PK=<status>`) or all orders via `GSI3` (`GSI3PK="ALL_ORDERS"`, `GSI3SK=created_at#order_id`) |
| **8. Reviews** (`lenscart-reviews`) | `product_id` (`"PROD#..."`) | `review_sort` (`"REV#<iso_ts>#<user_sub>"`) | `GSI1PK`: `user_id` (`"USER#<cognito_sub>"`)<br/>`GSI1SK`: `created_at#product_id` | — | • List reviews for a product (`Query PK="PROD#<id>"`)<br/>• Verify customer hasn't duplicate-reviewed & list customer reviews (`Query GSI1`) |

### Transactional Consistency (`TransactWriteItems`)
When a customer places an order (`POST /orders`):
1. Backend fetches all cart items for `USER#<sub_from_jwt>` and batch-fetches authoritative product records (`price`, `discount_percent`, `is_active`) and address record.
2. Backend executes a single atomic DynamoDB **`TransactWriteItems`** call that:
   * Decrements `available_qty` and increments `reserved_qty` on each item in `lenscart-inventory` with `ConditionExpression: available_qty >= :requested_qty AND is_active = :true`.
   * Writes the authoritative order record (`PK="ORD#<ulid>"`, `SK="META"`) and initial timeline entry (`SK="EVENT#<timestamp>"`) to `lenscart-orders` with `attribute_not_exists(PK)` (idempotency guard).
   * Writes an inventory audit log entry (`SK="LOG#<timestamp>#<order_id>"`).
3. If any product has insufficient stock or was deactivated concurrently, the entire transaction rolls back cleanly with HTTP `409 Conflict` and identifies the exact out-of-stock item.

### Category-Specific Technical Specification Schemas
Products store a strongly-typed `specifications` map validated by Pydantic per category:
* **Cameras (`cameras`):** `sensor_type` (Full-Frame CMOS, APS-C, Micro Four Thirds, Medium Format), `megapixels` (float), `lens_mount` (`Sony E`, `Canon RF`, `Nikon Z`, `Fujifilm X`, `L-Mount`), `iso_range`, `max_video_resolution`, `autofocus_points`, `in_body_stabilization` (bool), `weight_grams`, `weather_sealed` (bool).
* **Camera Lenses (`lenses`):** `lens_mount` (`Sony E`, `Canon RF`, `Nikon Z`, `Fujifilm X`, `L-Mount`), `focal_length_mm` (e.g., `"24-70mm"`), ` focal_type` (`Prime` / `Zoom`), `max_aperture` (e.g., `"f/2.8"`), `min_aperture`, `optical_stabilization` (bool), `filter_thread_mm` (int), `min_focus_distance_cm`, `weight_grams`, `full_frame_compatible` (bool).
* **Tripods & Stabilizers (`tripods`):** `equipment_type` (`Tripod`, `Gimbal`, `Monopod`), `material` (`Carbon Fiber`, `Aluminum`), `max_payload_kg`, `max_height_cm`, `folded_length_cm`, `head_type`, `quick_release_plate` (e.g., `"Arca-Swiss"`), `weight_grams`.
* **Lighting Equipment (`lighting`):** `light_type` (`COB LED`, `RGB Panel`, `Strobe / Flash`), `power_output_watts`, `color_temperature_kelvin` (e.g., `"2700K-6500K"`), `cri_rating`, `tlci_rating`, `mount_type` (e.g., `"Bowens Mount"`), `battery_option`.
* **Audio, Accessories, Storage & Bags:** Validated structured attributes (`polar_pattern`, `capacity_gb`, `read_speed_mbps`, `write_speed_mbps`, `card_type`, `compatible_mounts`, `interior_dimensions_cm`).

---

## 5. REST API Contract Specification

All endpoints return a consistent JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "page_size": 12, "total": 48, "request_id": "..." }
}
```
Errors return standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `422`, `500`) with:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock for Sony FE 24-70mm f/2.8 GM II",
    "details": { "product_id": "PROD#lens-sony-2470gm2", "available": 2, "requested": 4 }
  }
}
```

### Endpoint Matrix

| Domain | Method & Path | Auth Role | Description & Key Query/Body Parameters |
| :--- | :--- | :--- | :--- |
| **Auth & Profile** | `GET /auth/me` | `Customer` / `Admin` | Returns verified Cognito identity (`sub`, `email`, `name`, `roles`), saved profile settings, and summary counts. |
| | `GET /profile/addresses` | `Customer` / `Admin` | Lists authenticated user's saved delivery addresses (`Query PK=USER#<sub>`). |
| | `POST /profile/addresses` | `Customer` / `Admin` | Creates a new delivery address for the authenticated user. |
| | `DELETE /profile/addresses/{address_id}` | `Customer` / `Admin` | Deletes an address owned by the authenticated user. |
| **Products & Categories** | `GET /products` | Public | Supports `q` (search), `category_id`, `brand`, `min_price`, `max_price`, `min_rating`, `lens_mount`, `in_stock_only`, `featured`, `is_new_arrival`, `on_sale`, `sort_by` (`price_asc`, `price_desc`, `popularity`, `rating`, `newest`), `page`, `page_size`. |
| | `GET /products/{product_id}` | Public | Returns full product details, category-specific specs, live stock status, warranty info, and compatible accessories/lenses. |
| | `POST /products/compare` | Public | Accepts `{ "product_ids": ["PROD#1", "PROD#2", ...] }` (2–4 items) and returns aligned side-by-side specification matrix. |
| | `GET /products/{product_id}/compatibility` | Public | Given a camera `product_id` (or `lens_mount`), queries `GSI3` (`MOUNT#<mount>`) to return 100% mount-compatible lenses and accessories. |
| | `GET /categories` | Public | Lists all 8 photography categories with product counts and metadata. |
| | `GET /categories/{category_id}` | Public | Returns category details, spec schema template, and featured items in that category. |
| **Cart** | `GET /cart` | `Customer` | Retrieves persisted cart items enriched with live authoritative prices, discounts, stock validation warnings, subtotal, discount total, and final total. |
| | `POST /cart/items` | `Customer` | Body: `{ "product_id": "...", "quantity": 1 }`. Validates active product and current stock before upserting. |
| | `PATCH /cart/items/{item_id}` | `Customer` | Body: `{ "quantity": 2 }`. Validates stock and updates quantity (or removes if `0`). |
| | `DELETE /cart/items/{item_id}` | `Customer` | Removes item from the authenticated customer's cart. |
| **Wishlist** | `GET /wishlist` | `Customer` | Retrieves saved wishlist products with live price and stock availability. |
| | `POST /wishlist` | `Customer` | Body: `{ "product_id": "..." }`. Saves product to customer's wishlist. |
| | `DELETE /wishlist/{product_id}` | `Customer` | Removes product from customer's wishlist (also supports moving to cart). |
| **Orders** | `POST /orders` | `Customer` | Body: `{ "address_id": "...", "payment_method": "SIMULATED_CARD" \| "SIMULATED_UPI", "idempotency_key": "..." }`. Re-validates stock & prices, executes `TransactWriteItems`, clears cart, and enqueues async SQS event. |
| | `GET /orders` | `Customer` | Lists authenticated customer's orders (`Query GSI1PK=USER#<sub>`) sorted newest first. |
| | `GET /orders/{order_id}` | `Customer` | Returns order details, simulated payment receipt, and status timeline (`Placed -> Confirmed -> Processing -> Packed -> Shipped -> Delivered`). Enforces ownership (`order.user_id == jwt.sub`). |
| | `POST /orders/{order_id}/cancel` | `Customer` | Cancels order if status is `Placed`, `Confirmed`, or `Processing`; atomically restores inventory stock and appends cancellation timeline event. |
| **Reviews** | `GET /products/{product_id}/reviews` | Public | Paginated list of customer reviews and rating breakdown for a product. |
| | `POST /products/{product_id}/reviews` | `Customer` | Body: `{ "rating": 5, "title": "...", "comment": "..." }`. Verifies user authentication, prevents duplicate reviews, and updates product rating aggregate. |
| **Admin** | `GET /admin/dashboard` | `Admin` | Returns KPI metrics (total orders, total products, total customers, simulated revenue, pending orders, low-stock items, recent orders, daily/monthly sales series, category performance). |
| | `POST /admin/products` | `Admin` | Creates a new product + initializes its `lenscart-inventory` stock record in a transaction. |
| | `PATCH /admin/products/{product_id}` | `Admin` | Updates product details, technical specifications, pricing, discounts, or active status. |
| | `DELETE /admin/products/{product_id}` | `Admin` | Soft-deactivates (`catalog_status = "INACTIVE"`) or deletes product safely without breaking historical orders. |
| | `POST /admin/products/upload-url` | `Admin` | Generates a restricted S3 Presigned `PUT` URL enforcing `Content-Type` (`image/jpeg`, `image/png`, `image/webp`) and max file size (`5 MB`). |
| | `GET /admin/orders` | `Admin` | Lists all customer orders with filtering by `status`, `date_from`, `date_to`, and customer search. |
| | `PATCH /admin/orders/{order_id}` | `Admin` | Transitions order status (`Confirmed`, `Processing`, `Packed`, `Shipped`, `Delivered`, `Cancelled`), records admin audit trail, and triggers SQS/SNS notification. |
| | `GET /admin/inventory` | `Admin` | Lists inventory levels, low-stock alerts (`GSI1PK="LOW_STOCK"`), and stock movement logs; supports `POST /admin/inventory/{product_id}/adjust` for audited stock adjustments. |
| | `GET /admin/customers` | `Admin` | Lists customer profiles with order count, lifetime value, and account status (`ACTIVE` / `SUSPENDED`), plus `PATCH /admin/customers/{user_id}/status`. |

---

## 6. AWS Free Account Eligibility & Cost-Risk Matrix

> [!IMPORTANT]
> In accordance with Section 3 ("STRICT AWS FREE ACCOUNT REQUIREMENT"), **no AWS resources will be created or deployed without your explicit approval**. Below is the verified AWS Free Account / Free Tier eligibility analysis and the exact guardrails built into our SAM template to prevent unexpected charges.

| AWS Service | Free Tier / Free Account Allowance | Cost Risk & Expiration Profile | LensCart Mitigation & Configuration |
| :--- | :--- | :--- | :--- |
| **AWS Lambda** (incl. **Function URLs**) | **Always Free:** 1,000,000 requests/month + 400,000 GB-seconds compute time/month. | **Very Low Risk.** Function URLs have no additional per-request fee beyond standard Lambda requests. | Configured with `256 MB` memory and `15s` timeout. Avoids API Gateway (whose 1M/mo free tier expires after 12 months). |
| **Amazon DynamoDB** | **Always Free:** 25 GB storage + up to 25 provisioned Write Capacity Units (WCU) & 25 Read Capacity Units (RCU) (capable of ~200M requests/month). | **Low Risk** if Provisioned Capacity is capped at `<= 25 RCU / 25 WCU` total across tables. | SAM template configures Provisioned Capacity (`2 RCU / 2 WCU` per table + GSI = `16 RCU / 16 WCU` total, well below the 25 RCU/WCU Always Free cap) with zero auto-scaling beyond free limits. |
| **Amazon Cognito User Pools** | **Always Free (Lite Tier):** 10,000 Monthly Active Users (MAUs) for direct sign-in. | **Low Risk** on Lite tier. Enabling "Plus" tier (advanced security features) incurs paid charges. | Explicitly configured on standard/Lite feature plan without paid Advanced Security / Plus add-ons; email verification uses Cognito's built-in default email limit (free up to 50 emails/day) rather than paid SES setups. |
| **Amazon S3** | **12-Months Free (New Accounts):** 5 GB Standard storage, 20,000 GET requests, 2,000 PUT/POST/LIST requests/month. | **Medium Risk** if expired after 12 months (~$0.023/GB/mo) or if excessive PUT/LIST calls occur. | Both frontend bundle and product media buckets enforce strict lifecycle rules, 5 MB max image upload limits, long `Cache-Control` headers (`max-age=31536000` for static assets), and zero bucket listing from client code. |
| **Amazon CloudFront** | **Always Free:** 1 TB data transfer out/month + 10,000,000 HTTP/HTTPS requests/month. | **Very Low Risk.** Dramatically reduces S3 `GET` requests by caching static bundle and product images at the edge. | Configured with PriceClass_100, Origin Access Control (OAC) to private S3 buckets, and default `cloudfront.net` HTTPS certificate (zero custom domain cost). |
| **Amazon SQS** | **Always Free:** 1,000,000 requests/month. | **Low Risk** unless Lambda polls an empty queue with short polling. | **Crucial Cost Control:** Configured with `ReceiveMessageWaitTimeSeconds: 20` (**Long Polling**), reducing idle empty poll requests to ~3 per minute (~130,000/month for a single queue, well under the 1M free allowance). |
| **Amazon SNS** | **Always Free:** 1,000,000 publishes/month + 1,000 email deliveries/month + free Lambda/SQS deliveries. | **Low Risk** for topic publishes and email notifications; SMS is paid. | SMS is strictly disabled. Order notifications publish to SNS Standard Topic with optional email subscription within the 1,000 free email limit. |
| **Amazon EventBridge** | **Always Free:** Default bus AWS service events; EventBridge Scheduler includes 14,000,000 free invocations/month. | **Very Low Risk.** High-frequency schedules can consume Lambda invocations unnecessarily. | Scheduled maintenance rule runs **once every 24 hours** (`rate(1 day)`), consuming only 30 invocations/month. |
| **Amazon CloudWatch** | **Always Free:** 5 GB Log Data Ingestion, 5 GB Log Storage, 10 custom metrics, 10 alarms. | **Low Risk** with short log retention. | All Lambda Log Groups explicitly set `RetentionInDays: 3` in the SAM template so logs never accumulate storage costs. |

---

## 7. Staged Development & Verification Plan

We will execute and test the project in the **13 stages** specified in Section 11:

* **Stage 1: Project Structure & Frontend Foundation** — Initialize Vite + React + TypeScript project, install strict dependencies (Redux Toolkit, React Router, Bootstrap 5, React Hook Form, Zod, Recharts, Lucide React, Axios), configure store, API client, and TypeScript domain models.
* **Stage 2: Premium UI & Responsive Layouts** — Implement design tokens (`tokens.css` with Light & Dark themes), persistent theme switcher, responsive `CustomerLayout` (Navbar with live search/cart/wishlist badges, Footer), and protected `AdminLayout` sidebar shell.
* **Stage 3: Customer Authentication** — Build Login, Register, Forgot Password pages with React Hook Form + Zod, Cognito JWT integration (with local development Cognito-compatible JWT issuer/verifier for instant end-to-end testing plus real AWS Cognito User Pool support), and role-based route protection (`Customer` vs `Admin`).
* **Stage 4: Backend Foundation & API Structure** — Build modular FastAPI application (`main.py`, `config.py`, CORS, structured exception handlers, request size guard, JWT auth middleware, role dependencies, and Mangum Lambda handler).
* **Stage 5: DynamoDB Integration & Database Design** — Implement all 8 DynamoDB repositories (`Products`, `Categories`, `Carts`, `Orders`, `Inventory`, `Wishlists`, `Reviews`, `Addresses`) with zero routine table scans, plus automated table bootstrap and realistic photography equipment seed script (Sony, Canon, Nikon, Fujifilm, Sigma, DJI, Peak Design, SanDisk, Godox, Rode).
* **Stage 6: Product Catalogue & Product Details** — Implement `/products` and `/categories` APIs and connect the Home Page, Catalogue Page (search, category/brand/price/rating filters, sorting, pagination), and Product Detail Page (image gallery, category-specific specs, warranty, live stock, reviews, compatible gear).
* **Stage 7: Cart, Wishlist & Checkout** — Implement `/cart`, `/wishlist`, and `/profile/addresses` APIs and connect persistent Cart drawer/page, Wishlist page (move to cart), and multi-step Checkout flow with simulated payment and server-side price/stock verification.
* **Stage 8: Order Processing & Inventory Management** — Implement transactional `POST /orders` (`TransactWriteItems` across Orders and Inventory), `GET /orders`, `POST /orders/{id}/cancel` with atomic stock restoration, My Orders page, Order Tracking timeline UI, and Customer Profile page.
* **Stage 9: Admin Dashboard** — Implement `/admin/*` endpoints and connect Admin Dashboard (KPIs + Recharts analytics), Product Management (CRUD + category specs + S3 presigned image upload), Inventory Management (stock adjustments + movement audit logs + low-stock alerts), Order Management (status transitions + timeline history), and Customer Management.
* **Stage 10: SQS, SNS & EventBridge Integration** — Implement asynchronous SQS order worker (`sqs_worker.py` with idempotency keys and DLQ support), SNS order notification publisher, and EventBridge daily maintenance worker (`eventbridge_worker.py` for low-stock scans and simulated delivery progression).
* **Stage 11: Product Compatibility & Comparison** — Implement structured camera-to-lens mount compatibility resolver (`GET /products/{id}/compatibility`) and side-by-side multi-product specification comparator (`POST /products/compare`) with dedicated interactive UI pages.
* **Stage 12: CloudWatch Monitoring, Security & Full Test Suite** — Configure structured CloudWatch JSON logging, security headers, input/upload validation, and execute the complete backend (`pytest`) and frontend (`vitest`) test suite covering unit, integration, RBAC, customer isolation, cart calculation, and inventory consistency tests.
* **Stage 13: AWS SAM Infrastructure Templates & Documentation** — Author the complete AWS SAM `template.yaml` (with 3-day CloudWatch log retention, 20s SQS long polling, Lambda Function URLs, DynamoDB Free Tier provisioned capacity, Cognito Lite tier, private S3 + CloudFront OAC) and generate all required documentation (`README.md`, Architecture, DB Design, API Reference, AWS Setup & Free Tier Cost Control Guide).
