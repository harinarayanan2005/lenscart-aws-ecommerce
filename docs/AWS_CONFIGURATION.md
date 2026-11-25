# LensCart — AWS Configuration & Free Account Cost-Risk Assessment (`ap-south-1` Mumbai)

## 1. Environment Variables Reference

### Backend (`backend/.env.example`)
| Variable | Local Default | Production AWS Value |
| :--- | :--- | :--- |
| `AWS_REGION` | `ap-south-1` | `ap-south-1` (Mumbai) |
| `USE_LOCAL_AWS` | `true` | `false` |
| `TABLE_PREFIX` | `lenscart` | `lenscart` |
| `DYNAMODB_PRODUCTS_TABLE` | *(uses prefix)* | `lenscart-products` |
| `DYNAMODB_ORDERS_TABLE` | *(uses prefix)* | `lenscart-orders` |
| `S3_MEDIA_BUCKET` | `lenscart-product-media-private` | Output `ProductMediaBucketName` |
| `S3_FRONTEND_BUCKET` | `lenscart-frontend-assets` | Output `FrontendBucketName` |
| `CLOUDFRONT_MEDIA_DOMAIN` | *(empty locally)* | Output `CloudFrontDomainName` |
| `COGNITO_USER_POOL_ID` | *(empty locally)* | Output `CognitoUserPoolId` |
| `COGNITO_CLIENT_ID` | *(empty locally)* | Output `CognitoClientId` |
| `SQS_ORDER_QUEUE_URL` | *(auto-created in Moto)* | Output `OrderQueueUrl` |
| `SNS_TOPIC_ARN` | *(auto-created in Moto)* | Output `OrderEventsTopicArn` |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | `https://<CloudFrontDomainName>` |

### Frontend (`frontend/.env.example`)
| Variable | Local Default | Production AWS Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Output `ApiFunctionUrl` |
| `VITE_AWS_REGION` | `ap-south-1` | `ap-south-1` |
| `VITE_COGNITO_USER_POOL_ID` | *(empty locally)* | Output `CognitoUserPoolId` |
| `VITE_COGNITO_CLIENT_ID` | *(empty locally)* | Output `CognitoClientId` |
| `VITE_CLOUDFRONT_MEDIA_URL` | *(empty locally)* | `https://<CloudFrontDomainName>` |

---

## 2. AWS Free Account Plan & Cost-Risk Assessment (`ap-south-1`)

| AWS Service | LensCart Configuration | AWS Free Tier / Credit Eligibility | Cost-Risk Assessment |
| :--- | :--- | :--- | :--- |
| **AWS Lambda + Function URL** | 3 functions (`256 MB`, `15s` timeout), Function URL instead of API Gateway | **Always Free**: 1M requests/month + 400,000 GB-sec/month | **Very Low** ($0 under normal traffic; avoids API Gateway per-million fees) |
| **Amazon DynamoDB** | 8 tables + GSIs totaling **19 RCU / 19 WCU** provisioned capacity | **Always Free**: 25 RCU + 25 WCU + 25 GB storage | **Very Low** ($0 as long as total provisioned capacity in `ap-south-1` stays <= 25 RCU/WCU) |
| **Amazon Cognito** | 1 User Pool (`customers` & `administrators` groups), Lite/Essentials features only | **Always Free**: 10,000 MAUs on Cognito User Pool Lite tier | **Very Low** ($0 up to 10,000 active users; do not enable paid Plus/Advanced security add-ons) |
| **Amazon S3** | 2 private buckets (`FrontendAssetsBucket`, `ProductMediaBucket`) | **12-Month Free Tier / Free Plan Credits**: 5 GB Standard storage, 20,000 GET, 2,000 PUT | **Low** (SVG/WebP catalog uses < 15 MB; avoid frequent full-bucket re-uploads) |
| **Amazon CloudFront** | 1 distribution with OAC serving SPA + `/product_media/*` | **Always Free**: 1 TB data transfer out/month + 10M HTTP/HTTPS requests/month | **Very Low** (Avoid >1,000 manual invalidation paths/month) |
| **Amazon SQS** | 1 standard queue (`ReceiveMessageWaitTimeSeconds: 20` long polling) + 1 DLQ | **Always Free**: 1M requests/month | **Very Low** (20s long polling prevents empty-poll request exhaustion) |
| **Amazon SNS** | 1 standard topic (`lenscart-order-events`) | **Always Free**: 1M publishes + 1,000 email notifications/month | **Very Low** (Do not attach paid SMS subscriptions) |
| **Amazon EventBridge** | 1 schedule (`rate(1 day)`) | **Always Free**: 14M scheduler invocations/month | **Zero** (30 invocations/month) |
| **Amazon CloudWatch** | 3 log groups with `RetentionInDays: 3` + stdout EMF metrics | **Always Free**: 5 GB log ingestion/storage | **Very Low** (3-day retention prevents log accumulation) |

