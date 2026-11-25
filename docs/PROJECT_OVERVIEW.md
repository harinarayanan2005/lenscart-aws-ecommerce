# LensCart — Project Overview

**LensCart – Photography Equipment & Accessories Store** is a production-style full-stack e-commerce platform architected for AWS Serverless deployment in **ap-south-1 (Mumbai)** within AWS Free Tier constraints.

## Core Capabilities
1. **Customer Storefront (`React 18 + TypeScript + Vite + Bootstrap 5 + Redux Toolkit`)**:
   - **8 Equipment Categories & 29 Curated Products**: Cameras, Camera Lenses, Tripods and Stabilizers, Lighting Equipment, Audio Equipment, Camera Accessories, Memory Cards and Storage, and Camera Bags and Protection.
   - **Camera & Lens Compatibility Checker**: Exact mount-system matching (`Sony E`, `Canon RF`, `Nikon Z`, `Fujifilm X`, `L-Mount`, `Universal`) powered by DynamoDB `GSI3-LensMount`.
   - **Side-by-Side Technical Comparison**: Compare up to 4 products across category-specific optical and mechanical specifications.
   - **Shopping Cart, Wishlist & Simulated Checkout**: Server-side price/tax/shipping calculation, conditional stock reservation, DynamoDB-backed idempotency, and order lifecycle tracking (`Placed` → `Confirmed` → `Processing` → `Packed` → `Shipped` → `Delivered` / `Cancelled`).
2. **Administrator Application**:
   - Executive KPI Dashboard & Recharts Sales Analytics (Daily Revenue Trend & Category Revenue Distribution).
   - Full Product CRUD with S3 Presigned PUT Image Uploads & S3 Image Deletion.
   - Real-time Inventory Ledger, Low-Stock Alerts (`GSI1-StockAlert`), and Stock Adjustments.
   - Order Status Management & Customer Account Status Control (`ACTIVE` / `SUSPENDED`).

