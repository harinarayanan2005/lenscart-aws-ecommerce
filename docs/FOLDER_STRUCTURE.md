# LensCart — Complete Folder Structure

```text
LensCart/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── providers.tsx
│   │   ├── assets/
│   │   │   └── styles/index.css
│   │   ├── components/
│   │   │   ├── cart/CartDrawer.tsx
│   │   │   ├── charts/index.ts
│   │   │   ├── common/CommonWidgets.tsx
│   │   │   ├── forms/index.ts
│   │   │   ├── layout/{Footer.tsx, Layouts.tsx, Navbar.tsx}
│   │   │   ├── navigation/index.ts
│   │   │   └── products/ProductCard.tsx
│   │   ├── constants/index.ts
│   │   ├── features/{auth,cart,checkout,wishlist,orders,products,admin}/index.ts
│   │   ├── hooks/index.ts
│   │   ├── layouts/{CustomerLayout.tsx, AdminLayout.tsx, AuthLayout.tsx}
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   └── errors/NotFoundPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── productService.ts
│   │   │   ├── cartService.ts
│   │   │   ├── orderService.ts
│   │   │   └── adminService.ts
│   │   ├── store/
│   │   │   ├── index.ts
│   │   │   └── slices/
│   │   ├── styles/{tokens.css, main.css}
│   │   ├── types/index.ts
│   │   ├── utils/{formatters.ts, validation.ts}
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── auth_router.py
│   │   │   ├── product_router.py
│   │   │   ├── category_router.py
│   │   │   ├── cart_router.py
│   │   │   ├── wishlist_router.py
│   │   │   ├── order_router.py
│   │   │   ├── review_router.py
│   │   │   ├── address_router.py
│   │   │   ├── inventory_router.py
│   │   │   └── admin_router.py
│   │   ├── schemas/models.py
│   │   ├── services/{catalog_service.py, cart_order_service.py, admin_service.py}
│   │   ├── repositories/{category_repo.py, product_repo.py, inventory_repo.py, customer_repo.py, order_review_repo.py}
│   │   ├── dependencies/auth.py
│   │   ├── middleware/security.py
│   │   ├── aws/{cognito.py, s3.py, dynamodb.py, sqs.py, sns.py, cloudwatch.py}
│   │   ├── utils/{logger.py, pricing.py}
│   │   └── lambda_handlers/
│   │       ├── api_handler.py
│   │       ├── order_worker.py
│   │       └── maintenance_handler.py
│   ├── scripts/
│   │   ├── seed_data.py
│   │   ├── upload_product_images.py
│   │   └── validate_aws_config.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_products.py
│   │   ├── test_orders.py
│   │   ├── test_inventory.py
│   │   └── test_aws_integrations.py
│   ├── requirements.txt
│   └── .env.example
├── product_media/
│   ├── cameras/
│   ├── lenses/
│   ├── tripods/
│   ├── lighting/
│   ├── audio/
│   ├── accessories/
│   └── storage/
├── infrastructure/
│   ├── sam/
│   │   ├── template.yaml
│   │   ├── samconfig.toml.example
│   │   └── parameters/ap-south-1.json
│   ├── policies/least_privilege_iam.json
│   ├── cloudfront/distribution-config.json
│   └── README.md
├── docs/
├── .gitignore
├── README.md
└── LICENSE
```

