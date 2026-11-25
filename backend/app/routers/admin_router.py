from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from app.aws.cognito import cognito_idp
from app.aws.s3 import delete_product_image, generate_presigned_image_upload
from app.config import settings
from app.dependencies.auth import require_admin
from app.repositories.order_review_repo import ReviewRepository
from app.schemas.models import (
    AdminCustomerStatusRequest,
    AdminOrderStatusUpdateRequest,
    AdminProductCreateRequest,
    AdminProductUpdateRequest,
    PresignedUploadRequest,
    ProductImageDeleteRequest,
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Admin Portal"])
rev_repo = ReviewRepository()


@router.get("", response_class=HTMLResponse, include_in_schema=False)
@router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def backend_admin_inspector() -> HTMLResponse:
    """
    Live Backend & DynamoDB Inspector at http://127.0.0.1:8000/admin/
    Strictly enabled only in local development (USE_LOCAL_AWS=true).
    """
    if not settings.USE_LOCAL_AWS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct backend inspector is disabled in AWS production. Use the authenticated CloudFront Admin Portal.",
        )
    metrics = admin_service.get_dashboard_metrics()
    customers = admin_service.list_customers_with_stats()
    orders = admin_service.list_orders()

    cust_rows = ""
    for c in customers:
        is_new = "aarav.mehta@lenscart.com" in c.get("email", "")
        badge = '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;margin-left:6px;">NEW USER</span>' if is_new else ""
        cust_rows += f"""
        <tr style="{'background:rgba(200,157,84,0.12);' if is_new else ''}">
          <td><strong>{c.get('name')}</strong> {badge}<br/><small style="color:#94a3b8">{c.get('sub')}</small></td>
          <td>{c.get('email')}</td>
          <td>{c.get('phone', '-')}</td>
          <td><span style="color:#4ade80;font-weight:600">{c.get('status', 'ACTIVE')}</span></td>
          <td><strong>{c.get('order_count', 0)}</strong></td>
          <td style="font-family:monospace;font-weight:700;color:#c89d54">${float(c.get('total_spent', 0)):,.2f}</td>
        </tr>
        """

    order_rows = ""
    for o in orders:
        items_summary = ", ".join(f"{i.get('name')} (x{i.get('quantity', 1)})" for i in o.get("items", []))
        status_val = o.get("order_status", "Placed")
        status_color = {
            "Delivered": "#4ade80",
            "Processing": "#60a5fa",
            "Confirmed": "#fbbf24",
            "Cancelled": "#f87171",
        }.get(status_val, "#cbd5e1")
        order_rows += f"""
        <tr>
          <td style="font-family:monospace;font-weight:700">{o.get('order_id')}</td>
          <td><strong>{o.get('customer_name')}</strong><br/><small style="color:#94a3b8">{o.get('customer_email')}</small></td>
          <td style="max-width:340px;font-size:13px">{items_summary}</td>
          <td><span style="font-family:monospace;font-size:12px">{o.get('payment_method')}</span></td>
          <td><span style="color:{status_color};font-weight:700">{status_val}</span></td>
          <td style="font-family:monospace;font-weight:700;color:#c89d54">${float(o.get('final_total', 0)):,.2f}</td>
          <td style="font-size:12px;color:#94a3b8">{str(o.get('created_at', ''))[:19].replace('T', ' ')}</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>LensCart — Backend & DynamoDB Admin Inspector</title>
  <style>
    body {{ background:#0d1017; color:#f1f5f9; font-family:system-ui,-apple-system,sans-serif; margin:0; padding:28px 36px; }}
    .header {{ display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:18px; margin-bottom:24px; flex-wrap:wrap; gap:12px; }}
    .btn {{ background:#c89d54; color:#0d1017; text-decoration:none; padding:9px 16px; border-radius:6px; font-weight:700; font-size:13px; display:inline-block; }}
    .btn-outline {{ border:1px solid #334155; color:#e2e8f0; text-decoration:none; padding:8px 14px; border-radius:6px; font-size:13px; display:inline-block; margin-left:8px; }}
    .kpis {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:28px; }}
    .kpi {{ background:#161b26; border:1px solid #262f40; border-radius:10px; padding:16px 20px; }}
    .kpi-label {{ color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px; }}
    .kpi-val {{ font-size:26px; font-weight:800; color:#c89d54; margin-top:6px; font-family:monospace; }}
    h2 {{ font-size:18px; margin:26px 0 12px; color:#f8fafc; }}
    table {{ width:100%; border-collapse:collapse; background:#161b26; border:1px solid #262f40; border-radius:10px; overflow:hidden; margin-bottom:28px; }}
    th {{ background:#1e2536; color:#94a3b8; text-align:left; padding:12px 14px; font-size:12px; text-transform:uppercase; letter-spacing:0.8px; }}
    td {{ padding:12px 14px; border-top:1px solid #262f40; font-size:14px; vertical-align:middle; }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="color:#c89d54;font-size:12px;font-weight:700;letter-spacing:2px">LENSCART FASTAPI + DYNAMODB BACKEND</div>
      <h1 style="margin:4px 0 0;font-size:24px">Live Backend Database Inspector (127.0.0.1:8000/admin/)</h1>
    </div>
    <div>
      <a class="btn" href="http://localhost:5173/admin" target="_blank">Open Full React Admin UI (localhost:5173/admin) →</a>
      <a class="btn-outline" href="/docs" target="_blank">Swagger API Docs (/docs)</a>
      <a class="btn-outline" href="/health" target="_blank">Health JSON</a>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total Revenue (Active Orders)</div>
      <div class="kpi-val">${float(metrics.get('total_revenue', 0)):,.2f}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Orders in DynamoDB</div>
      <div class="kpi-val">{metrics.get('total_orders', len(orders))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Registered Customers</div>
      <div class="kpi-val">{len(customers)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Active Catalogue Products</div>
      <div class="kpi-val">{metrics.get('total_products', 36)}</div>
    </div>
  </div>

  <h2>1. Registered Customers in Backend (Cognito + DynamoDB)</h2>
  <table>
    <thead>
      <tr>
        <th>Customer Name &amp; ID</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Orders Placed</th>
        <th>Total Active Spend</th>
      </tr>
    </thead>
    <tbody>
      {cust_rows}
    </tbody>
  </table>

  <h2>2. Live Orders in DynamoDB (lenscart-orders)</h2>
  <table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Customer</th>
        <th>Equipment Ordered</th>
        <th>Payment Method</th>
        <th>Order Status</th>
        <th>Final Total</th>
        <th>Created At (UTC)</th>
      </tr>
    </thead>
    <tbody>
      {order_rows}
    </tbody>
  </table>
</body>
</html>"""
    return HTMLResponse(content=html)



@router.get("/dashboard")
async def get_admin_dashboard(
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    return {"success": True, "data": admin_service.get_dashboard_metrics()}


@router.post("/products/upload-url")
async def create_presigned_upload_url(
    payload: PresignedUploadRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    url_data = generate_presigned_image_upload(
        filename=payload.filename,
        content_type=payload.content_type,
        file_size_bytes=payload.file_size_bytes,
        category_folder=payload.category_folder,
    )
    return {"success": True, "data": url_data}


@router.post("/products/delete-image")
async def delete_uploaded_product_image(
    payload: ProductImageDeleteRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    deleted = delete_product_image(payload.object_key)
    return {"success": True, "data": {"deleted": deleted, "object_key": payload.object_key}}


@router.post("/products", status_code=201)
async def create_product(
    payload: AdminProductCreateRequest,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    created = admin_service.create_product(payload.model_dump(), admin)
    return {"success": True, "data": created}


@router.patch("/products/{product_id:path}")
async def update_product(
    product_id: str,
    payload: AdminProductUpdateRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = admin_service.update_product(
        product_id, payload.model_dump(exclude_unset=True)
    )
    return {"success": True, "data": updated}


@router.delete("/products/{product_id:path}")
async def delete_product(
    product_id: str,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    res = admin_service.delete_or_deactivate_product(product_id)
    return {"success": True, "data": res}


@router.get("/orders")
async def list_admin_orders(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    orders = admin_service.list_orders(status_filter=status, search=search)
    return {"success": True, "data": orders}


@router.patch("/orders/{order_id:path}")
async def update_admin_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdateRequest,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = admin_service.update_order_status(
        order_id=order_id,
        new_status=payload.status,
        note=payload.note,
        admin_user=admin,
    )
    return {"success": True, "data": updated}


@router.get("/customers")
async def list_admin_customers(
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    customers = admin_service.list_customers_with_stats()
    return {"success": True, "data": customers}


@router.patch("/customers/{user_id}/status")
async def update_customer_status(
    user_id: str,
    payload: AdminCustomerStatusRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    updated = cognito_idp.update_user_status(user_id, payload.status)
    return {"success": True, "data": updated}


@router.delete("/reviews/{product_id}/{review_sort:path}")
async def delete_product_review(
    product_id: str,
    review_sort: str,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    deleted = rev_repo.delete_review(product_id, review_sort)
    return {"success": True, "data": {"deleted": deleted}}
