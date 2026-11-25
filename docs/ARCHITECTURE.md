# LensCart — AWS Serverless Architecture (`ap-south-1`)

## High-Level Topology

```mermaid
flowchart TD
    User["Customer / Administrator Browser"] -->|HTTPS| CF["Amazon CloudFront Distribution (OAC)"]
    CF -->|Default Behavior /*| S3Web["Private S3 Frontend Bucket"]
    CF -->|Path Behavior /product_media/*| S3Media["Private S3 Product Media Bucket"]
    User -->|HTTPS REST + Bearer JWT| FnURL["AWS Lambda Function URL (FastAPI + Mangum)"]
    FnURL -->|Verify RS256 JWKS / Auth APIs| Cognito["Amazon Cognito User Pool (customers / administrators)"]
    FnURL -->|Query / PutItem / Conditional Update| DDB["Amazon DynamoDB (8 Tables, 19 RCU / 19 WCU)"]
    FnURL -->|Presigned PUT / DeleteObject| S3Media
    FnURL -->|SendMessage (Order Created)| SQS["Amazon SQS Order Queue (20s Long Polling + DLQ)"]
    SQS -->|Batch Trigger| Worker["AWS Lambda Order Worker"]
    Worker -->|Idempotent Confirm| DDB
    Worker -->|Publish Notification| SNS["Amazon SNS Order Events Topic"]
    EB["Amazon EventBridge (rate: 1 day)"] -->|Daily Audit| Maint["AWS Lambda Maintenance Handler"]
    Maint -->|Low-Stock & Stale Order Check| DDB
    Maint -->|Publish Alert| SNS
```

## Key Architectural Decisions
- **AWS Lambda Function URL** instead of API Gateway to eliminate per-million API Gateway charges while supporting native HTTPS and CORS.
- **Private S3 Buckets + CloudFront Origin Access Control (OAC)** so neither the frontend bucket nor the product media bucket is ever publicly readable via direct S3 URLs.
- **Zero DynamoDB Table Scans**: Every access pattern uses Partition Keys, Sort Keys, or Global Secondary Indexes (`GSI1`–`GSI3`).

