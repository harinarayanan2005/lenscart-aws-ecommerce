import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Boxes,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  UploadCloud,
  UserCheck,
  UserX,
} from 'lucide-react';
import { adminApi, catalogApi, extractErrorMessage } from '../../services/api';
import { useAppDispatch } from '../../store';
import { addToast } from '../../store/slices/uiSlice';
import type {
  Category,
  InventoryRecord,
  Order,
  OrderStatus,
  Product,
  UserProfile,
} from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { AdminProductFormValues, adminProductSchema } from '../../utils/validation';
import { StockBadge } from '../../components/common/CommonWidgets';

export const AdminProductsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [presignedInfo, setPresignedInfo] = useState<string | null>(null);

  const form = useForm<AdminProductFormValues>({
    resolver: zodResolver(adminProductSchema),
    defaultValues: {
      name: '',
      sku: '',
      brand: 'Sony',
      category_id: 'CAT#cameras',
      price: 1999,
      discount_percent: 0,
      short_description: '',
      description: '',
      warranty_info: '2-Year Authorized Manufacturer Warranty',
      initial_stock: 15,
      low_stock_threshold: 5,
      lens_mount: 'Sony E',
      image_url:
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
      is_featured: false,
      is_new_arrival: true,
      is_best_seller: false,
    },
  });

  const loadData = async () => {
    const [prodRes, cats] = await Promise.all([
      catalogApi.getProducts({ page: 1, page_size: 50 }),
      catalogApi.getCategories(),
    ]);
    setProducts(prodRes.data);
    setCategories(cats);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePresignedUrl = async () => {
    try {
      const res = await adminApi.getPresignedUploadUrl({
        filename: 'studio-product-shot.webp',
        content_type: 'image/webp',
        file_size_bytes: 420000,
      });
      setPresignedInfo(`Generated S3 Presigned PUT URL (Key: ${res.object_key}, Expires: ${res.expires_in}s)`);
      dispatch(
        addToast({
          type: 'success',
          message: 'Generated private S3 presigned upload URL with 5MB & MIME policy.',
        })
      );
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  const onSubmitProduct = async (values: AdminProductFormValues) => {
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.product_id, {
          name: values.name,
          brand: values.brand,
          category_id: values.category_id,
          price: values.price,
          discount_percent: values.discount_percent,
          short_description: values.short_description,
          description: values.description,
          warranty_info: values.warranty_info,
          lens_mount: values.lens_mount,
          images: [values.image_url],
          is_featured: values.is_featured,
          is_new_arrival: values.is_new_arrival,
          is_best_seller: values.is_best_seller,
        });
        dispatch(addToast({ type: 'success', message: `Updated ${values.name}.` }));
      } else {
        await adminApi.createProduct({
          name: values.name,
          sku: values.sku,
          brand: values.brand,
          category_id: values.category_id,
          price: values.price,
          discount_percent: values.discount_percent,
          short_description: values.short_description,
          description: values.description,
          warranty_info: values.warranty_info,
          initial_stock: values.initial_stock,
          low_stock_threshold: values.low_stock_threshold,
          lens_mount: values.lens_mount || 'Universal',
          images: [values.image_url],
          specifications: {
            lens_mount: values.lens_mount || 'Universal',
            weather_sealed: true,
          },
          is_featured: values.is_featured,
          is_new_arrival: values.is_new_arrival,
          is_best_seller: values.is_best_seller,
        });
        dispatch(addToast({ type: 'success', message: `Created product ${values.name}.` }));
      }
      setShowCreateModal(false);
      setEditingProduct(null);
      form.reset();
      loadData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  const handleDeactivate = async (productId: string, name: string) => {
    try {
      await adminApi.deleteProduct(productId);
      dispatch(addToast({ type: 'info', message: `Deactivated ${name}.` }));
      loadData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    form.reset({
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      category_id: p.category_id,
      price: p.price,
      discount_percent: p.discount_percent,
      short_description: p.short_description,
      description: p.description,
      warranty_info: p.warranty_info,
      initial_stock: p.available_qty,
      low_stock_threshold: p.low_stock_threshold,
      lens_mount: p.lens_mount || 'Universal',
      image_url: p.images?.[0] || '',
      is_featured: p.is_featured,
      is_new_arrival: p.is_new_arrival,
      is_best_seller: p.is_best_seller,
    });
    setShowCreateModal(true);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
            Catalogue Administration
          </span>
          <h1 className="h3 mb-0">Product & Specification Management ({products.length})</h1>
        </div>
        <div className="d-flex gap-2">
          <button type="button" onClick={handleGeneratePresignedUrl} className="lc-btn-outline">
            <UploadCloud size={15} /> Test S3 Presigned Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              form.reset();
              setShowCreateModal(!showCreateModal);
            }}
            className="lc-btn-primary"
          >
            <Plus size={15} /> {showCreateModal ? 'Close Form' : 'New Equipment SKU'}
          </button>
        </div>
      </div>

      {presignedInfo && (
        <div className="alert alert-info py-2 small lc-mono mb-3">{presignedInfo}</div>
      )}

      {showCreateModal && (
        <div className="lc-card p-4 mb-4">
          <h5 className="mb-3">
            {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Photography Equipment'}
          </h5>
          <form onSubmit={form.handleSubmit(onSubmitProduct)}>
            <div className="row g-3">
              <div className="col-md-5">
                <label className="lc-label">Product Name</label>
                <input className="lc-input" {...form.register('name')} />
              </div>
              <div className="col-md-3">
                <label className="lc-label">SKU</label>
                <input className="lc-input lc-mono" {...form.register('sku')} />
              </div>
              <div className="col-md-2">
                <label className="lc-label">Brand</label>
                <input className="lc-input" {...form.register('brand')} />
              </div>
              <div className="col-md-2">
                <label className="lc-label">Mount</label>
                <input className="lc-input" placeholder="Sony E, Canon RF..." {...form.register('lens_mount')} />
              </div>

              <div className="col-md-4">
                <label className="lc-label">Category</label>
                <select className="lc-select" {...form.register('category_id')}>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="lc-label">Retail Price ($)</label>
                <input type="number" step="0.01" className="lc-input" {...form.register('price')} />
              </div>
              <div className="col-md-2">
                <label className="lc-label">Discount (%)</label>
                <input type="number" className="lc-input" {...form.register('discount_percent')} />
              </div>
              <div className="col-md-3">
                <label className="lc-label">Initial Stock</label>
                <input type="number" className="lc-input" {...form.register('initial_stock')} />
              </div>

              <div className="col-md-6">
                <label className="lc-label">Image Asset URL (S3 / CDN)</label>
                <input className="lc-input" {...form.register('image_url')} />
              </div>
              <div className="col-md-6">
                <label className="lc-label">Warranty Policy</label>
                <input className="lc-input" {...form.register('warranty_info')} />
              </div>

              <div className="col-12">
                <label className="lc-label">Short Summary</label>
                <input className="lc-input" {...form.register('short_description')} />
              </div>
              <div className="col-12">
                <label className="lc-label">Full Technical Description</label>
                <textarea rows={2} className="lc-input" {...form.register('description')} />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="lc-btn-primary">
                {editingProduct ? 'Save Changes' : 'Publish Equipment'}
              </button>
              <button
                type="button"
                className="lc-btn-outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="lc-card overflow-auto">
        <table className="table align-middle mb-0 small">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>SKU / Mount</th>
              <th>Category</th>
              <th>Retail / Final</th>
              <th>Stock</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }}
                    />
                    <div>
                      <div className="fw-semibold">{p.name}</div>
                      <div style={{ color: 'var(--lc-text-muted)', fontSize: '0.75rem' }}>
                        {p.brand}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="lc-mono">
                  <div>{p.sku}</div>
                  <span className="lc-badge lc-badge-neutral">{p.lens_mount}</span>
                </td>
                <td>{p.category_name}</td>
                <td className="lc-mono">
                  <div>{formatCurrency(p.final_price)}</div>
                  {p.discount_percent > 0 && (
                    <span className="text-danger" style={{ fontSize: '0.75rem' }}>
                      -{p.discount_percent}% off {formatCurrency(p.price)}
                    </span>
                  )}
                </td>
                <td>
                  <StockBadge
                    availableQty={p.available_qty}
                    lowStockThreshold={p.low_stock_threshold}
                  />
                </td>
                <td className="text-end">
                  <div className="d-inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="lc-btn-outline btn-sm"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(p.product_id, p.name)}
                      className="lc-btn-outline btn-sm text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminInventoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [delta, setDelta] = useState<number>(10);
  const [reason, setReason] = useState<string>('Warehouse restock shipment received');

  const loadInventory = async (filterLow: boolean) => {
    const data = await adminApi.getInventory(filterLow);
    setRecords(data);
  };

  useEffect(() => {
    loadInventory(lowStockOnly);
  }, [lowStockOnly]);

  const handleAdjust = async (productId: string) => {
    try {
      await adminApi.adjustStock(productId, { delta, reason });
      dispatch(
        addToast({
          type: 'success',
          message: `Adjusted stock by ${delta > 0 ? `+${delta}` : delta} units.`,
        })
      );
      setAdjustingId(null);
      loadInventory(lowStockOnly);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
            Warehouse & Stock Ledger
          </span>
          <h1 className="h3 mb-0">Inventory Management & Audit Logs</h1>
        </div>
        <div className="form-check form-switch">
          <input
            id="low-stock-toggle"
            type="checkbox"
            className="form-check-input"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <label htmlFor="low-stock-toggle" className="form-check-label small fw-semibold">
            Show Low-Stock Alerts Only
          </label>
        </div>
      </div>

      <div className="d-flex flex-column gap-3">
        {records.map((rec) => (
          <div key={rec.product_id} className="lc-card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <span className="small lc-mono me-2" style={{ color: 'var(--lc-text-muted)' }}>
                  {rec.sku}
                </span>
                <span className="fw-semibold">{rec.product_name}</span>
                <div className="small" style={{ color: 'var(--lc-text-secondary)' }}>
                  Available: <strong className="lc-mono">{rec.available_qty}</strong> · Reserved:{' '}
                  <strong className="lc-mono">{rec.reserved_qty}</strong> · Low Threshold:{' '}
                  <strong className="lc-mono">{rec.low_stock_threshold}</strong>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <StockBadge
                  availableQty={rec.available_qty}
                  lowStockThreshold={rec.low_stock_threshold}
                />
                <button
                  type="button"
                  className="lc-btn-outline btn-sm"
                  onClick={() =>
                    setAdjustingId(adjustingId === rec.product_id ? null : rec.product_id)
                  }
                >
                  <Boxes size={14} /> Adjust Stock
                </button>
              </div>
            </div>

            {adjustingId === rec.product_id && (
              <div className="mt-3 pt-3 border-top row g-2 align-items-end" style={{ borderColor: 'var(--lc-border-color)' }}>
                <div className="col-md-3">
                  <label className="lc-label">Quantity Delta (+/-)</label>
                  <input
                    type="number"
                    className="lc-input lc-mono"
                    value={delta}
                    onChange={(e) => setDelta(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="lc-label">Audit Reason</label>
                  <input
                    type="text"
                    className="lc-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <button
                    type="button"
                    onClick={() => handleAdjust(rec.product_id)}
                    className="lc-btn-primary w-100"
                  >
                    Commit Adjustment
                  </button>
                </div>
              </div>
            )}

            {rec.recent_logs && rec.recent_logs.length > 0 && (
              <div className="mt-2 pt-2 border-top small" style={{ borderColor: 'var(--lc-border-color)' }}>
                <div className="text-uppercase fw-semibold mb-1" style={{ fontSize: '0.7rem', color: 'var(--lc-text-muted)' }}>
                  Recent Stock Movement History
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {rec.recent_logs.slice(0, 3).map((log) => (
                    <span key={log.log_id} className="lc-badge lc-badge-neutral lc-mono">
                      {log.delta > 0 ? `+${log.delta}` : log.delta} ({log.previous_qty}→{log.new_qty}) · {log.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminOrdersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const loadOrders = async () => {
    const list = await adminApi.getOrders({
      status: statusFilter || undefined,
      search: search || undefined,
    });
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(
        orderId,
        newStatus,
        `Status updated to ${newStatus} from Admin Order Fulfillment Console.`
      );
      dispatch(addToast({ type: 'success', message: `Order ${orderId} → ${newStatus}` }));
      loadOrders();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
            Fulfillment Operations
          </span>
          <h1 className="h3 mb-0">Order Management ({orders.length})</h1>
        </div>
        <div className="d-flex gap-2">
          <input
            type="search"
            className="lc-input"
            placeholder="Search Order ID or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
          />
          <select
            className="lc-select"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['Placed', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="d-flex flex-column gap-3">
        {orders.map((ord) => (
          <div key={ord.order_id} className="lc-card p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div>
                <span className="lc-mono fw-bold me-2">{ord.order_id}</span>
                <span className="small fw-semibold">{ord.customer_name}</span>
                <span className="small ms-2" style={{ color: 'var(--lc-text-muted)' }}>
                  ({ord.customer_email})
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="lc-mono fw-bold">{formatCurrency(ord.final_total)}</span>
                <select
                  className="lc-select"
                  style={{ width: 155, padding: '0.3rem 0.6rem', fontSize: '0.84rem' }}
                  value={ord.order_status}
                  onChange={(e) => handleStatusChange(ord.order_id, e.target.value as OrderStatus)}
                >
                  {[
                    'Placed',
                    'Confirmed',
                    'Processing',
                    'Packed',
                    'Shipped',
                    'Delivered',
                    'Cancelled',
                  ].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="small mb-2" style={{ color: 'var(--lc-text-secondary)' }}>
              Items: {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
            </div>
            <div className="small" style={{ fontSize: '0.76rem', color: 'var(--lc-text-muted)' }}>
              Latest Event:{' '}
              {ord.timeline[ord.timeline.length - 1]?.note} (
              {formatDateTime(ord.timeline[ord.timeline.length - 1]?.timestamp)})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminCustomersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [customers, setCustomers] = useState<
    Array<UserProfile & { order_count: number; total_spent: number; recent_orders: Order[] }>
  >([]);

  const loadCustomers = async () => {
    const data = await adminApi.getCustomers();
    setCustomers(data);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleToggleStatus = async (sub: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    const next = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateCustomerStatus(sub, next);
      dispatch(addToast({ type: 'info', message: `Updated account ${sub} to ${next}.` }));
      loadCustomers();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  return (
    <div>
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Cognito User Pool Directory
        </span>
        <h1 className="h3 mb-0">Customer Management ({customers.length})</h1>
      </div>

      <div className="lc-card overflow-auto">
        <table className="table align-middle mb-0 small">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Cognito Subject</th>
              <th>Roles</th>
              <th>Orders</th>
              <th>Lifetime Value</th>
              <th>Status</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.sub}>
                <td>
                  <div className="fw-semibold">{c.name}</div>
                  <div style={{ color: 'var(--lc-text-muted)' }}>{c.email}</div>
                </td>
                <td className="lc-mono">{c.sub}</td>
                <td>
                  {c.roles.map((r) => (
                    <span key={r} className="lc-badge lc-badge-neutral me-1">
                      {r}
                    </span>
                  ))}
                </td>
                <td className="lc-mono">{c.order_count}</td>
                <td className="lc-mono fw-semibold">{formatCurrency(c.total_spent)}</td>
                <td>
                  <span
                    className={`lc-badge ${
                      c.status === 'ACTIVE' ? 'lc-badge-success' : 'lc-badge-danger'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="text-end">
                  {!c.roles.includes('Admin') && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c.sub, c.status)}
                      className="lc-btn-outline btn-sm"
                    >
                      {c.status === 'ACTIVE' ? (
                        <>
                          <UserX size={13} /> Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} /> Activate
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

