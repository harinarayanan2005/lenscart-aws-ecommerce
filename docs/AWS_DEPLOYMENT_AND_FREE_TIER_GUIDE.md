# LensCart — AWS Deployment & Free Tier Cost-Control Guide

> [!IMPORTANT]
> **No AWS resources are deployed automatically.** Deploy only when you explicitly choose to run the AWS SAM CLI commands below against your AWS Free Account.

---

## 1. AWS Free Account Guardrails Built Into `infrastructure/sam/template.yaml`

1. **AWS Lambda Function URLs instead of API Gateway:**
   - API Gateway's free tier expires after 12 months.
   - AWS Lambda Function URLs are included in **AWS Lambda's Always Free Tier** (1,000,000 requests/month + 400,000 GB-seconds compute/month permanently).
2. **DynamoDB Provisioned Capacity Capped at 20 RCU / 20 WCU:**
   - Amazon DynamoDB's Always Free tier provides 25 GB storage + 25 RCU + 25 WCU across the region.
   - Our 8 tables + GSIs allocate a combined **20 RCU and 20 WCU**, leaving a 5 RCU / 5 WCU safety buffer so DynamoDB never incurs provisioned throughput charges.
3. **Amazon Cognito User Pool (Lite Tier):**
   - Configured without paid Plus/Advanced Security add-ons, providing **10,000 Monthly Active Users (MAUs) Always Free**.
4. **Amazon SQS 20-Second Long Polling (`ReceiveMessageWaitTimeSeconds: 20`):**
   - Prevents empty short-polling loops from exhausting the 1,000,000 free monthly SQS requests.
5. **Amazon EventBridge 24-Hour Schedule (`rate(1 day)`):**
   - Runs the low-stock and stale-order maintenance Lambda once per day (30 invocations/month).
6. **Amazon CloudWatch 3-Day Log Retention (`RetentionInDays: 3`):**
   - Prevents log storage accumulation beyond the 5 GB Always Free log storage limit.
7. **Private S3 + CloudFront Origin Access Control (OAC):**
   - CloudFront provides **1 TB data transfer out/month and 10,000,000 HTTPS requests/month Always Free**, caching static assets and product images at the edge so S3 `GET` requests stay minimal.

---

## 2. Step-by-Step Deployment Instructions (When Approved)

### Prerequisites
- AWS CLI v2 configured with a least-privilege IAM user (`aws configure`)
- AWS SAM CLI installed (`sam --version`)
- Python 3.11+ and Node.js 20+

### Step 1: Build & Deploy Serverless Backend Infrastructure
```powershell
cd d:\PROJECTS\lenscart\infrastructure\sam
sam build --template-file template.yaml
sam deploy --guided --stack-name lenscart-serverless-stack --capabilities CAPABILITY_IAM
```
Note the outputs returned by `sam deploy`:
- `ApiFunctionUrl` (e.g., `https://xyz.lambda-url.us-east-1.on.aws/`)
- `CloudFrontDomainName` (e.g., `https://d12345.cloudfront.net`)
- `CognitoUserPoolId` and `CognitoClientId`

### Step 2: Build & Upload Frontend Assets to Private S3 Bucket
```powershell
cd d:\PROJECTS\lenscart\frontend
$env:VITE_API_BASE_URL="https://<your-lambda-function-url>.lambda-url.us-east-1.on.aws"
npm.cmd run build
aws s3 sync dist/ s3://<FrontendAssetsBucketName>/ --delete --cache-control "max-age=31536000,public"
```

### Step 3: Set Up a Zero-Spend AWS Budget Alert (Recommended)
In the **AWS Billing & Cost Management Console -> Budgets**, create a **Zero-Spend Budget** ($0.01 threshold) with your email address to receive an immediate alert if any resource ever approaches a paid tier.

