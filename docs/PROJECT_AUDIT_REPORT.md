# LensCart — Phase 1 Complete Project Audit Report

## 1. Executive Summary
A comprehensive line-by-line inspection of the existing **LensCart – Photography Equipment & Accessories Store** (`d:\PROJECTS\lenscart`) was performed prior to restructuring and AWS production integration. A clean Git checkpoint (`commit b117cf8`) was created before modifying any source files.

---

## 2. Existing Working Functionality (Preserved)
1. **Customer Storefront (`React 18 + TypeScript + Vite + Bootstrap 5 + Redux Toolkit`)**:
   - Home Page, Product Catalogue (29 products across 8 categories), Category & Mount Filtering (`Sony E`, `Canon RF`, `Nikon Z`, `Fujifilm X`, `L-Mount`, `Universal`), Product Detail Page with technical specifications & reviews, Camera & Lens Mount Compatibility Checker, Side-by-Side Product Comparison (up to 4 items), Cart Drawer & Cart Page, Wishlist, Simulated Checkout, My Orders & Order Tracking (`Placed` → `Confirmed` → `Processing` → `Packed` → `Shipped` → `Delivered` / `Cancelled`), and Customer Profile & Address Book.
   - Light & Dark themes with persistent preference and responsive layouts.
2. **Administrator Portal**:
   - Executive Dashboard with KPI cards and Recharts analytics (Daily Revenue Trend & Category Revenue Distribution), Product CRUD + S3 Presigned Upload integration, Inventory Ledger & Stock Adjustment, Order Lifecycle Management, and Customer Account Status Management (`ACTIVE` / `SUSPENDED`).
3. **DynamoDB Access Patterns**:
   - 8 DynamoDB tables (`categories`, `products`, `inventory`, `carts`, `wishlists`, `addresses`, `orders`, `reviews`) using Partition Keys, Sort Keys, and Global Secondary Indexes (`GSI1`–`GSI3`) with zero `Scan` operations.

---

## 3. Identified Implementation Gaps, Mock Implementations & AWS Blockers

### A. Authentication (`backend/app/aws/cognito.py`) — CRITICAL GAP
- **Finding**: `CognitoIdentityProvider` currently uses in-memory Python dictionaries (`_users_by_email`, `_users_by_sub`, `_reset_codes`) and signs local HS256 JWTs (`JWT_SECRET_KEY`) even when `USE_LOCAL_AWS=False`.
- **Remediation (Phase 3)**:
  - Implement genuine `boto3.client("cognito-idp", region_name=settings.AWS_REGION)` operations when `USE_LOCAL_AWS=False`:
    - `sign_up`, `confirm_sign_up`, `admin_add_user_to_group` (`customers` / `administrators`), `initiate_auth` (`USER_PASSWORD_AUTH` & `REFRESH_TOKEN_AUTH`), `global_sign_out`, `forgot_password`, `confirm_forgot_password`, `list_users`, `admin_disable_user` / `admin_enable_user`.
  - Implement genuine RS256 JWKS verification using `jwt.PyJWKClient` against `https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json`, validating signature, `exp`, `iss`, `token_use` (`access` or `id`), and `client_id` / `aud`.
  - Support both `customers`/`administrators` and `Customer`/`Admin` group naming conventions and enforce strict role separation so registration never accepts an admin role from client input.
  - Retain deterministic local emulation strictly behind `USE_LOCAL_AWS=True` for offline automated testing.

### B. Product Images & S3 Delivery (`backend/scripts/seed_data.py`, `backend/app/aws/s3.py`) — CRITICAL GAP
- **Finding**:
  1. `seed_data.py` currently references external `https://images.unsplash.com/...` URLs instead of S3 object keys in `product_media/{cameras,lenses,tripods,lighting,audio,accessories,storage}/`.
  2. `s3.py` returns a direct `https://{bucket}.s3.{region}.amazonaws.com/{key}` URL as `public_asset_url`, which fails on a private S3 bucket (`BlockPublicAccess=True`) unless served through CloudFront Origin Access Control (OAC) or a presigned GET URL.
  3. Missing image deletion (`delete_object`), thumbnail selection, and `scripts/upload_product_images.py` migration script.
- **Remediation (Phase 4)**:
  - Generate local authorized SVG studio product photography files under `product_media/{cameras,lenses,tripods,lighting,audio,accessories,storage}/` for all 29 products.
  - Update `seed_data.py` to store S3 object keys (`product_media/cameras/...`) in DynamoDB instead of external Unsplash URLs.
  - Implement `resolve_media_url(object_key)` in `backend/app/aws/s3.py` to resolve S3 object keys to:
    1. CloudFront OAC URL (`https://{CLOUDFRONT_MEDIA_DOMAIN}/{object_key}`) when configured in production, or
    2. Short-lived S3 Presigned GET URL when running on AWS without a CloudFront media domain, or
    3. Local static media endpoint (`/media/{object_key}`) when `USE_LOCAL_AWS=True`.
  - Create `backend/scripts/upload_product_images.py` to upload `product_media/` to S3 and verify/update DynamoDB product records without deleting local source files.

### C. Folder Structure & Modularity Gaps — STRUCTURAL GAP
- **Finding**:
  - **Backend**: Routers are currently grouped into 4 files (`auth_router.py`, `catalog_router.py`, `cart_order_router.py`, `admin_router.py`) instead of the 10 dedicated domain routers (`auth_router.py`, `product_router.py`, `category_router.py`, `cart_router.py`, `wishlist_router.py`, `order_router.py`, `review_router.py`, `address_router.py`, `inventory_router.py`, `admin_router.py`).
  - **Backend Lambda Handlers**: Currently in `app/handlers/` (`api_handler.py`, `sqs_worker.py`, `eventbridge_worker.py`) instead of `app/lambda_handlers/` (`api_handler.py`, `order_worker.py`, `maintenance_handler.py`).
  - **Backend CloudWatch Module**: Missing `app/aws/cloudwatch.py`.
  - **Backend Scripts & Tests**: Missing `scripts/upload_product_images.py`, `scripts/validate_aws_config.py`, and dedicated test modules (`tests/test_auth.py`, `tests/test_products.py`, `tests/test_orders.py`, `tests/test_inventory.py`, `tests/test_aws_integrations.py`).
  - **Frontend**: Missing modular `src/app/` (`App.tsx`, `router.tsx`, `providers.tsx`), `src/layouts/` (`CustomerLayout.tsx`, `AdminLayout.tsx`, `AuthLayout.tsx`), domain service modules (`authService.ts`, `productService.ts`, `cartService.ts`, `orderService.ts`, `adminService.ts`), `src/features/`, `src/hooks/`, `src/constants/`, and `src/pages/errors/`.
- **Remediation (Phase 2)**:
  - Reorganize both frontend and backend into the required modular hierarchy while maintaining clean re-exports where appropriate so zero imports break.

### D. DynamoDB Order Idempotency & Persistent Deduplication — RELIABILITY GAP
- **Finding**: `CartAndOrderService._idempotency_map` and `sqs_worker._processed_idempotency_keys` are in-memory Python sets/dicts, which reset across AWS Lambda cold starts.
- **Remediation (Phase 5 & 6)**:
  - Persist order idempotency records in DynamoDB (`orders` table using `PK=IDEMPOTENCY#{hash}`, `SK=METADATA` with conditional `attribute_not_exists(order_id)`) so duplicate checkout submissions and redelivered SQS messages are safely deduplicated across stateless Lambda invocations.

### E. AWS Region & Infrastructure (`infrastructure/sam/template.yaml`) — DEPLOYMENT GAP
- **Finding**:
  1. `AWS_REGION` defaults to `us-east-1` instead of `ap-south-1` (Mumbai).
  2. `template.yaml` needs S3 Bucket Policies granting `cloudfront.amazonaws.com` OAC read access to both `FrontendAssetsBucket` and `ProductMediaBucket`, dual CloudFront origins (Frontend + `/product_media/*`), `DeletionPolicy: Retain` / `UpdateReplacePolicy: Retain` on stateful DynamoDB tables, Cognito IAM permissions on `CoreApiFunction`, and `samconfig.toml.example`.
- **Remediation (Phase 7)**:
  - Default all configs and `.env.example` files to `ap-south-1` (Mumbai) and upgrade `infrastructure/sam/template.yaml`, `infrastructure/sam/samconfig.toml.example`, `infrastructure/cloudfront/`, and `infrastructure/README.md`.

