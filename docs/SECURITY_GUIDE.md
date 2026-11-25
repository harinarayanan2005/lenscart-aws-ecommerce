# LensCart — Cloud & Application Security Guide

## 1. Authentication & JWT Verification (`backend/app/aws/cognito.py`)
- **Production Cognito Verification (`USE_LOCAL_AWS=false`)**:
  - Verifies RS256 signatures against the Amazon Cognito User Pool JWKS endpoint (`https://cognito-idp.ap-south-1.amazonaws.com/<pool_id>/.well-known/jwks.json`).
  - Validates `exp` (token expiration), `iss` (User Pool issuer URL), `token_use` (`access` or `id`), and `client_id` / `aud` matching `COGNITO_CLIENT_ID`.
  - Never accepts a token merely because it can be base64-decoded.
- **Role-Based Authorization (`customers` vs `administrators`)**:
  - Self-registration (`POST /auth/register`) unconditionally assigns the `customers` group and ignores any client-supplied role fields.
  - All `/admin/*` routes enforce `Depends(require_admin)`, verifying membership in the `administrators` / `Admin` group.
  - Zero passwords are stored in DynamoDB.

## 2. Token Storage Security Assessment
- Access tokens are stored in browser `localStorage` (`lenscart_jwt_token`) for SPA session continuity across page reloads and attached via `Authorization: Bearer <token>` headers.
- To mitigate XSS token exposure:
  1. `SecurityAndSizeLimitMiddleware` enforces `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.
  2. React automatically escapes all dynamic text expressions, and no `dangerouslySetInnerHTML` is used anywhere in the codebase.
  3. No Cognito client secrets or AWS IAM keys are ever exposed in frontend environment variables.

## 3. Private S3 Media & Upload Security (`backend/app/aws/s3.py`)
- Both `FrontendAssetsBucket` and `ProductMediaBucket` block all public ACLs and public bucket policies (`PublicAccessBlockConfiguration` enabled).
- Only Amazon CloudFront (authenticated via SigV4 Origin Access Control) and the backend Lambda execution role can read objects.
- Admin image uploads use short-lived (300-second) S3 presigned PUT URLs after strict MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`) and file size (`<= 5 MB`) validation.

## 4. Transactional Order & Price Integrity (`backend/app/services/cart_order_service.py`)
- Product prices, discounts, shipping fees, and taxes are computed exclusively on the backend from authoritative DynamoDB records.
- Stock reservations use DynamoDB `ConditionExpression="available_qty >= :q"` with automatic rollback if any line item fails, plus DynamoDB-persisted idempotency locks (`IDEMPOTENCY#{hash}` and `SQS_PROCESSED#{key}`).

