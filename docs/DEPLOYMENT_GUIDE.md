# LensCart — Manual AWS Deployment Guide (`ap-south-1` Mumbai)

> [!IMPORTANT]
> No AWS resources have been automatically created or deployed. Follow these step-by-step commands only when you explicitly choose to deploy to your AWS account.

## Prerequisites
1. **AWS CLI v2** configured with an IAM user/role in `ap-south-1`:
   ```powershell
   aws configure
   # Default region name: ap-south-1
   ```
2. **AWS SAM CLI** installed (`sam --version`).
3. **Python 3.11+** and **Node.js 18+**.

---

## Step 1: Validate & Build the AWS SAM Serverless Stack
```powershell
cd d:\PROJECTS\lenscart\infrastructure\sam
sam validate --lint
sam build
```

## Step 2: Deploy the Backend & CloudFront Infrastructure to `ap-south-1`
```powershell
sam deploy --guided --region ap-south-1
```
- Stack Name: `lenscart-serverless-prod`
- AWS Region: `ap-south-1`
- Record the CloudFormation **Outputs** printed at the end of deployment:
  - `ApiFunctionUrl`
  - `CloudFrontDomainName`
  - `FrontendBucketName`
  - `ProductMediaBucketName`
  - `CognitoUserPoolId`
  - `CognitoClientId`

## Step 3: Seed DynamoDB Tables & Upload Product Media to Private S3
Set your production environment variables in PowerShell and run the seed + S3 media upload scripts:
```powershell
cd d:\PROJECTS\lenscart\backend
$env:USE_LOCAL_AWS="false"
$env:AWS_REGION="ap-south-1"
$env:S3_MEDIA_BUCKET="<ProductMediaBucketName>"
$env:COGNITO_USER_POOL_ID="<CognitoUserPoolId>"
$env:COGNITO_CLIENT_ID="<CognitoClientId>"

python -c "from scripts.seed_data import seed_initial_data; seed_initial_data()"
python -m scripts.upload_product_images
```

## Step 4: Create Your Initial Administrator User in Amazon Cognito
Register your account through the UI or CLI, then promote your user to the `administrators` group using the AWS CLI:
```powershell
aws cognito-idp admin-add-user-to-group `
  --region ap-south-1 `
  --user-pool-id <CognitoUserPoolId> `
  --username admin@lenscart.store `
  --group-name administrators
```

## Step 5: Build & Upload the React Frontend to the Private S3 Bucket
Create `d:\PROJECTS\lenscart\frontend\.env.production`:
```ini
VITE_API_BASE_URL=<ApiFunctionUrl>
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=<CognitoUserPoolId>
VITE_COGNITO_CLIENT_ID=<CognitoClientId>
VITE_CLOUDFRONT_MEDIA_URL=https://<CloudFrontDomainName>
```
Build and sync the static bundle to the private S3 frontend bucket:
```powershell
cd d:\PROJECTS\lenscart\frontend
npm.cmd install
npm.cmd run build
aws s3 sync dist/ s3://<FrontendBucketName>/ --delete --region ap-south-1
```

## Step 6: Access Your Live Public HTTPS Storefront
Open `https://<CloudFrontDomainName>` in your browser. Your application runs 100% serverlessly on AWS and does not require your personal computer to remain switched on.

