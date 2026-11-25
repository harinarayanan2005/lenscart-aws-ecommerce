# LensCart AWS Infrastructure (`ap-south-1` Mumbai)

This directory contains the AWS SAM / CloudFormation Infrastructure-as-Code templates, least-privilege IAM policies, and CloudFront Origin Access Control (OAC) configurations for **LensCart**.

## Directory Contents
- `sam/template.yaml` — Primary AWS SAM template defining:
  - **Amazon Cognito**: `LensCartUserPool`, `LensCartUserPoolClient`, `customers` & `administrators` groups.
  - **Amazon S3**: Private `FrontendAssetsBucket` and private `ProductMediaBucket` (`BlockPublicAccess: true`).
  - **Amazon CloudFront**: `FrontendCloudFrontDistribution` + `CloudFrontOriginAccessControl` (OAC) serving both the React SPA (`/`) and private product photography (`/product_media/*`) over HTTPS.
  - **Amazon DynamoDB**: 8 tables (`categories`, `products`, `inventory`, `carts`, `wishlists`, `addresses`, `orders`, `reviews`) capped at 19 RCU / 19 WCU total (within the 25 RCU / 25 WCU Always Free limit) with `DeletionPolicy: Retain`.
  - **AWS Lambda**: `CoreApiFunction` (with Lambda Function URL), `SqsOrderWorkerFunction`, and `EventBridgeMaintenanceFunction`.
  - **Amazon SQS & SNS**: `OrderProcessingQueue` (20s long polling) + `OrderProcessingDLQ` + `OrderEventsTopic`.
  - **Amazon CloudWatch**: 3-day log retention for all Lambda log groups.
- `sam/samconfig.toml.example` — Example SAM CLI configuration targeting `ap-south-1`.
- `sam/parameters/ap-south-1.json` — Parameter values for Mumbai (`ap-south-1`).
- `cloudfront/distribution-config.json` — Reference dual-origin CloudFront OAC configuration.
- `policies/least_privilege_iam.json` — Scoped IAM policy reference.

