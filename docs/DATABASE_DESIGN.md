# LensCart — DynamoDB Database Design & Access Patterns

## 1. Design Philosophy
1. **Zero Routine Table Scans (`Scan` Prohibited):** Every application query executes `GetItem` or `Query` against either a primary key (`PK` + `SK`) or a Global Secondary Index (`GSI1`, `GSI2`, `GSI3`). Our IAM policy (`infrastructure/policies/least_privilege_iam.json`) explicitly denies `dynamodb:Scan`.
2. **Strict Customer Data Isolation:** `Carts`, `Wishlists`, and `Addresses` use `user_id = "USER#<cognito_sub>"` as their Partition Key (`HASH`), derived exclusively from the verified Cognito JWT token—never from client request parameters.
3. **Always Free Capacity Allocation:** Across all 8 tables and GSIs in `infrastructure/sam/template.yaml`, total Provisioned Throughput is **20 RCU and 20 WCU**, staying safely inside the **Amazon DynamoDB Always Free limit of 25 RCU and 25 WCU** (and 25 GB storage).

---

## 2. Entity & Index Reference

### Table 1: `lenscart-categories`
- **Primary Key:** `PK = tenant_scope ("CATALOG")`, `SK = category_id ("CAT#cameras")`
- **GSI1 (`GSI1-Slug`):** `PK = slug`, `SK = sort_order_str`
- **Access Patterns:**
  - List all 8 categories sorted: `Query(tenant_scope = "CATALOG")`
  - Get category by ID: `GetItem(tenant_scope = "CATALOG", category_id = ...)`
  - Get category by slug: `Query(IndexName = "GSI1-Slug", slug = ...)`

### Table 2: `lenscart-products`
- **Primary Key:** `PK = product_id ("PROD#...")`, `SK = metadata ("META")`
- **GSI1 (`GSI1-CategoryPrice`):** `PK = category_id`, `SK = price_sort_key ("<padded_cents>#<product_id>")`
- **GSI2 (`GSI2-StatusPopularity`):** `PK = catalog_status ("ACTIVE" | "INACTIVE")`, `SK = popularity_sort_key`
- **GSI3 (`GSI3-LensMount`):** `PK = mount_index_key ("MOUNT#Sony E")`, `SK = price_sort_key`
- **Access Patterns:**
  - Get product details: `GetItem(product_id, metadata="META")`
  - Browse active catalog by popularity: `Query(IndexName="GSI2-StatusPopularity", catalog_status="ACTIVE")`
  - Filter products by category & price: `Query(IndexName="GSI1-CategoryPrice", category_id=...)`
  - Resolve compatible lenses/bodies by mount: `Query(IndexName="GSI3-LensMount", mount_index_key="MOUNT#<mount>")`

### Table 3: `lenscart-inventory`
- **Primary Key:** `PK = product_id ("PROD#...")`, `SK = record_type ("STOCK" | "LOG#<iso_ts>#<id>")`
- **GSI1 (`GSI1-StockAlert`):** `PK = stock_alert_status ("OK" | "LOW_STOCK" | "OUT_OF_STOCK")`, `SK = qty_sort_key`
- **Access Patterns:**
  - Real-time stock check: `GetItem(product_id, record_type="STOCK")`
  - Conditional stock reservation: `UpdateItem` with `ConditionExpression: available_qty >= :q`
  - Stock movement audit log: `Query(product_id=..., SK begins_with "LOG#")`
  - Low-stock alert query (Admin & EventBridge): `Query(IndexName="GSI1-StockAlert", stock_alert_status="LOW_STOCK")`

### Table 4: `lenscart-carts`
- **Primary Key:** `PK = user_id ("USER#<sub_from_jwt>")`, `SK = item_id ("ITEM#<product_id>")`

### Table 5: `lenscart-wishlists`
- **Primary Key:** `PK = user_id ("USER#<sub_from_jwt>")`, `SK = product_id ("PROD#...")`

### Table 6: `lenscart-addresses`
- **Primary Key:** `PK = user_id ("USER#<sub_from_jwt>")`, `SK = address_id ("ADDR#<uuid>")`

### Table 7: `lenscart-orders`
- **Primary Key:** `PK = order_id ("ORD#<id>")`, `SK = record_type ("META")`
- **GSI1 (`GSI1-UserOrders`):** `PK = user_id`, `SK = created_sort_key ("<iso_ts>#<order_id>")`
- **GSI2 (`GSI2-StatusOrders`):** `PK = order_status`, `SK = created_sort_key`
- **GSI3 (`GSI3-AllOrders`):** `PK = all_orders_partition ("ALL_ORDERS")`, `SK = created_sort_key`

### Table 8: `lenscart-reviews`
- **Primary Key:** `PK = product_id ("PROD#...")`, `SK = review_sort ("REV#<iso_ts>#<user_sub>")`
- **GSI1 (`GSI1-UserReviews`):** `PK = user_id`, `SK = review_sort`

