import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi, extractErrorMessage } from '../../services/api';
import { useAppDispatch } from '../../store';
import { addToast } from '../../store/slices/uiSlice';
import type { AdminDashboardMetrics } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const AdminDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !metrics) {
    return <div className="lc-card p-5 text-center">Loading Admin Studio Telemetry...</div>;
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)', letterSpacing: '0.08em' }}>
            Executive Overview
          </span>
          <h1 className="h3 mb-0">Operations & Telemetry Dashboard</h1>
        </div>
        <button type="button" onClick={loadDashboard} className="lc-btn-outline btn-sm">
          <RefreshCw size={14} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="lc-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)' }}>
                Simulated Revenue
              </span>
              <DollarSign size={18} color="var(--lc-success)" />
            </div>
            <div className="h4 mb-1 lc-mono">{formatCurrency(metrics.total_revenue)}</div>
            <div className="small" style={{ color: 'var(--lc-text-secondary)' }}>
              From {metrics.total_orders} total orders
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="lc-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)' }}>
                Pending Orders
              </span>
              <Clock size={18} color="var(--lc-info)" />
            </div>
            <div className="h4 mb-1 lc-mono">{metrics.pending_orders_count}</div>
            <Link to="/admin/orders" className="small" style={{ color: 'var(--lc-accent-primary)' }}>
              Manage fulfillment queue →
            </Link>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="lc-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)' }}>
                Low-Stock Alerts
              </span>
              <AlertTriangle size={18} color="var(--lc-warning)" />
            </div>
            <div className="h4 mb-1 lc-mono">{metrics.low_stock_count} SKUs</div>
            <Link to="/admin/inventory" className="small" style={{ color: 'var(--lc-accent-primary)' }}>
              Adjust warehouse stock →
            </Link>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="lc-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)' }}>
                Catalog & Customers
              </span>
              <Users size={18} color="var(--lc-accent-primary)" />
            </div>
            <div className="h4 mb-1 lc-mono">
              {metrics.total_products} Gear / {metrics.total_customers} Users
            </div>
            <Link to="/admin/products" className="small" style={{ color: 'var(--lc-accent-primary)' }}>
              Manage equipment catalog →
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3">Daily Revenue Trend (USD)</h6>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={metrics.daily_sales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--lc-border-color)" />
                  <XAxis dataKey="date" stroke="var(--lc-text-muted)" fontSize={12} />
                  <YAxis stroke="var(--lc-text-muted)" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#c83e2b"
                    fill="rgba(200, 62, 43, 0.18)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3">Category Revenue Performance</h6>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={metrics.category_performance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--lc-border-color)" />
                  <XAxis type="number" stroke="var(--lc-text-muted)" fontSize={12} />
                  <YAxis dataKey="category" type="category" width={110} stroke="var(--lc-text-muted)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#141413" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock & Recent Orders */}
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="lc-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Low-Stock Equipment Alerts</h6>
              <Link to="/admin/inventory" className="small">
                All Inventory →
              </Link>
            </div>
            {metrics.low_stock_products.length === 0 ? (
              <div className="small text-success">All SKUs are healthy above threshold.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {metrics.low_stock_products.map((item) => (
                  <div
                    key={item.product_id}
                    className="p-2 rounded border d-flex justify-content-between align-items-center small"
                    style={{ borderColor: 'var(--lc-border-color)' }}
                  >
                    <div>
                      <div className="fw-semibold">{item.product_name}</div>
                      <div className="lc-mono" style={{ fontSize: '0.75rem', color: 'var(--lc-text-muted)' }}>
                        SKU: {item.sku} · Threshold: {item.low_stock_threshold}
                      </div>
                    </div>
                    <span className="lc-badge lc-badge-warning">{item.available_qty} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="lc-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Recent Customer Orders</h6>
              <Link to="/admin/orders" className="small">
                Full Order Log →
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recent_orders.map((ord) => (
                    <tr key={ord.order_id}>
                      <td className="lc-mono fw-semibold">{ord.order_id}</td>
                      <td>{ord.customer_name}</td>
                      <td>
                        <span className="lc-badge lc-badge-info">{ord.order_status}</span>
                      </td>
                      <td className="lc-mono">{formatCurrency(ord.final_total)}</td>
                      <td>{formatDateTime(ord.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);

  useEffect(() => {
    adminApi.getDashboard().then(setMetrics);
  }, []);

  if (!metrics) {
    return <div className="lc-card p-5 text-center">Generating Sales & Inventory Reports...</div>;
  }

  return (
    <div>
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Business Intelligence
        </span>
        <h1 className="h3 mb-0">Reports & Sales Analytics</h1>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3 d-flex align-items-center gap-2">
              <BarChart3 size={16} /> Monthly Revenue & Order Volume
            </h6>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={metrics.monthly_sales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--lc-border-color)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#c83e2b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3 d-flex align-items-center gap-2">
              <ShoppingBag size={16} /> Category Revenue Share & Units Sold
            </h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle small mb-0">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Units Sold</th>
                    <th>Gross Revenue</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.category_performance.map((cat) => (
                    <tr key={cat.category}>
                      <td className="fw-semibold">{cat.category}</td>
                      <td className="lc-mono">{cat.units_sold}</td>
                      <td className="lc-mono">{formatCurrency(cat.revenue)}</td>
                      <td className="lc-mono">{cat.share_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3 d-flex align-items-center gap-2">
              <Package size={16} /> Top Performing Products by Popularity Score
            </h6>
            <div className="d-flex flex-column gap-2">
              {metrics.popular_products.map((p) => (
                <div
                  key={p.product_id}
                  className="p-2 rounded border d-flex justify-content-between align-items-center small"
                  style={{ borderColor: 'var(--lc-border-color)' }}
                >
                  <div>
                    <div className="fw-semibold">{p.name}</div>
                    <div style={{ color: 'var(--lc-text-muted)', fontSize: '0.75rem' }}>
                      {p.brand} · {p.category_name} · {p.review_count} Reviews ({p.rating_avg}★)
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="lc-mono fw-semibold">{formatCurrency(p.final_price)}</div>
                    <span className="lc-badge lc-badge-neutral">Score: {p.popularity_score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="lc-card p-4 h-100">
            <h6 className="mb-3">Order Status Distribution</h6>
            <div className="row g-2">
              {Object.entries(metrics.order_status_breakdown).map(([statusName, count]) => (
                <div key={statusName} className="col-6 col-sm-4">
                  <div className="p-3 rounded border text-center" style={{ borderColor: 'var(--lc-border-color)' }}>
                    <div className="h4 mb-1 lc-mono">{count}</div>
                    <div className="small fw-semibold">{statusName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

