import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addToast } from '../../store/slices/uiSlice';
import { authApi, extractErrorMessage, orderApi } from '../../services/api';
import type { Address, Order, OrderStatus } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { AddressFormValues, addressSchema } from '../../utils/validation';

const ORDER_STEPS: OrderStatus[] = [
  'Placed',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
];

export const MyOrdersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const list = await orderApi.getMyOrders();
      setOrders(list);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Fulfillment History
        </span>
        <h1 className="h2 mb-0">My Equipment Orders ({orders.length})</h1>
      </div>

      {loading ? (
        <div className="lc-card p-5 text-center">Loading order history from DynamoDB...</div>
      ) : orders.length === 0 ? (
        <div className="lc-card p-5 text-center">
          <Package size={40} className="mb-3" style={{ color: 'var(--lc-text-muted)' }} />
          <h5>No orders placed yet</h5>
          <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
            Once you complete checkout, you can track your equipment shipment status here.
          </p>
          <Link to="/catalogue" className="lc-btn-primary">
            Explore Equipment
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div key={order.order_id} className="lc-card p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 mb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
                <div>
                  <span className="lc-mono fw-bold me-2">{order.order_id}</span>
                  <span className="small" style={{ color: 'var(--lc-text-muted)' }}>
                    Placed {formatDateTime(order.created_at)}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span
                    className={`lc-badge ${
                      order.order_status === 'Delivered'
                        ? 'lc-badge-success'
                        : order.order_status === 'Cancelled'
                        ? 'lc-badge-danger'
                        : 'lc-badge-info'
                    }`}
                  >
                    {order.order_status}
                  </span>
                  <span className="lc-badge lc-badge-neutral">{order.payment_status}</span>
                  <span className="lc-mono fw-bold ms-2">
                    {formatCurrency(order.final_total)}
                  </span>
                </div>
              </div>

              <div className="row align-items-center g-3">
                <div className="col-md-8">
                  <div className="d-flex flex-column gap-2">
                    {order.items.map((item) => (
                      <div key={item.product_id} className="d-flex align-items-center gap-3 small">
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <div>
                          <div className="fw-semibold">{item.name}</div>
                          <div className="lc-mono" style={{ color: 'var(--lc-text-secondary)' }}>
                            Qty: {item.quantity} × {formatCurrency(item.final_unit_price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-md-4 text-md-end">
                  <Link
                    to={`/orders/${encodeURIComponent(order.order_id)}`}
                    className="lc-btn-outline"
                  >
                    Inspect & Track Order →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const dispatch = useAppDispatch();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const decodedOrderId = orderId ? decodeURIComponent(orderId) : '';

  useEffect(() => {
    if (decodedOrderId) {
      setLoading(true);
      orderApi
        .getOrderById(decodedOrderId)
        .then(setOrder)
        .catch((err) => dispatch(addToast({ type: 'error', message: extractErrorMessage(err) })))
        .finally(() => setLoading(false));
    }
  }, [decodedOrderId, dispatch]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await orderApi.cancelOrder(
        order.order_id,
        'Cancelled by customer from Order Tracking Portal'
      );
      setOrder(updated);
      dispatch(
        addToast({
          type: 'info',
          message: `Order ${order.order_id} cancelled and stock restored.`,
        })
      );
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="container py-5">
        <div className="lc-card p-5 text-center">
          {loading ? 'Loading order telemetry...' : 'Order not found.'}
        </div>
      </div>
    );
  }

  const canCancel = ['Placed', 'Confirmed', 'Processing'].includes(order.order_status);
  const currentStepIndex = ORDER_STEPS.indexOf(order.order_status);

  return (
    <div className="container py-4">
      <div className="mb-3">
        <Link to="/orders" className="small d-inline-flex align-items-center gap-1" style={{ color: 'var(--lc-text-secondary)' }}>
          <ArrowLeft size={14} /> Back to My Orders
        </Link>
      </div>

      <div className="lc-card p-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
              Order Tracking & Receipt
            </span>
            <h1 className="h3 mb-0 lc-mono">{order.order_id}</h1>
            <div className="small" style={{ color: 'var(--lc-text-muted)' }}>
              Placed {formatDateTime(order.created_at)} · Payment Ref: {order.payment_reference} (
              {order.payment_status})
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {canCancel && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="lc-btn-outline text-danger"
              >
                <XCircle size={15} /> {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        {/* Status Progress Bar */}
        {order.order_status === 'Cancelled' ? (
          <div className="alert alert-danger mb-4">
            <strong>Order Cancelled:</strong> Reserved equipment stock has been returned to
            warehouse inventory and simulated payment marked as refunded.
          </div>
        ) : (
          <div className="row g-2 mb-4">
            {ORDER_STEPS.map((step, idx) => {
              const completed = idx <= currentStepIndex;
              return (
                <div key={step} className="col-6 col-md-2">
                  <div
                    className="p-2 rounded text-center small fw-semibold border"
                    style={{
                      borderColor: completed ? 'var(--lc-success)' : 'var(--lc-border-color)',
                      backgroundColor: completed ? 'var(--lc-success-bg)' : 'var(--lc-bg-subtle)',
                      color: completed ? 'var(--lc-success)' : 'var(--lc-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={14} className="me-1" />
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-7">
            <h6 className="mb-3">Ordered Equipment</h6>
            <div className="d-flex flex-column gap-2 mb-4">
              {order.items.map((item) => (
                <div
                  key={item.product_id}
                  className="p-2 rounded border d-flex justify-content-between align-items-center"
                  style={{ borderColor: 'var(--lc-border-color)' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 60, height: 46, objectFit: 'cover', borderRadius: 4 }}
                    />
                    <div>
                      <Link
                        to={`/products/${encodeURIComponent(item.product_id)}`}
                        className="fw-semibold small"
                      >
                        {item.name}
                      </Link>
                      <div className="small lc-mono" style={{ color: 'var(--lc-text-muted)' }}>
                        SKU: {item.sku} · Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="lc-mono fw-semibold small">{formatCurrency(item.line_total)}</div>
                </div>
              ))}
            </div>

            <h6 className="mb-2">Fulfillment Activity Timeline</h6>
            <div className="d-flex flex-column gap-2">
              {order.timeline.map((ev, i) => (
                <div
                  key={i}
                  className="p-2 rounded small d-flex justify-content-between align-items-start"
                  style={{ backgroundColor: 'var(--lc-bg-subtle)' }}
                >
                  <div>
                    <span className="fw-semibold me-2">[{ev.status}]</span>
                    <span>{ev.note}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--lc-text-muted)' }}>
                      Actor: {ev.actor}
                    </div>
                  </div>
                  <span className="lc-mono" style={{ fontSize: '0.75rem', color: 'var(--lc-text-muted)' }}>
                    {formatDateTime(ev.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="p-3 rounded mb-3" style={{ backgroundColor: 'var(--lc-bg-subtle)' }}>
              <h6 className="mb-2">Shipping Destination</h6>
              <div className="small">
                <div className="fw-semibold">{order.shipping_address.full_name}</div>
                <div>{order.shipping_address.line1}</div>
                <div>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  {order.shipping_address.postal_code}
                </div>
                <div>Phone: {order.shipping_address.phone}</div>
              </div>
            </div>

            <div className="p-3 rounded" style={{ backgroundColor: 'var(--lc-bg-subtle)' }}>
              <h6 className="mb-2">Financial Breakdown</h6>
              <div className="d-flex justify-content-between small mb-1">
                <span>Subtotal</span>
                <span className="lc-mono">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1 text-success">
                <span>Discounts</span>
                <span className="lc-mono">-{formatCurrency(order.discount_total)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span>Shipping</span>
                <span className="lc-mono">{formatCurrency(order.shipping_fee)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span>Tax</span>
                <span className="lc-mono">{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold pt-2 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
                <span>Total Paid</span>
                <span className="lc-mono">{formatCurrency(order.final_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: user?.name || '',
      phone: user?.phone || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'United States',
      is_default: false,
    },
  });

  useEffect(() => {
    authApi.getAddresses().then(setAddresses).catch(() => setAddresses([]));
  }, []);

  const handleAddAddress = async (values: AddressFormValues) => {
    try {
      const created = await authApi.createAddress(values);
      setAddresses([created, ...addresses]);
      addressForm.reset();
      dispatch(addToast({ type: 'success', message: 'Address saved to your profile.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await authApi.deleteAddress(addressId);
      setAddresses(addresses.filter((a) => a.address_id !== addressId));
      dispatch(addToast({ type: 'info', message: 'Address removed.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Cognito Identity & Preferences
        </span>
        <h1 className="h2 mb-0">Customer Profile</h1>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="lc-card p-4">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: 'var(--lc-accent-subtle)' }}
              >
                <User size={24} color="var(--lc-accent-primary)" />
              </div>
              <div>
                <h5 className="mb-0">{user?.name}</h5>
                <span className="small" style={{ color: 'var(--lc-text-muted)' }}>
                  {user?.email}
                </span>
              </div>
            </div>

            <div className="small d-flex flex-column gap-2 pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
              <div>
                <strong>Cognito Subject ID:</strong>{' '}
                <span className="lc-mono">{user?.sub}</span>
              </div>
              <div>
                <strong>Authorized Roles:</strong>{' '}
                {user?.roles.map((r) => (
                  <span key={r} className="lc-badge lc-badge-info me-1">
                    {r}
                  </span>
                ))}
              </div>
              <div>
                <strong>Account Status:</strong>{' '}
                <span className="lc-badge lc-badge-success">{user?.status || 'ACTIVE'}</span>
              </div>
            </div>

            <div className="d-grid gap-2 mt-4">
              <Link to="/orders" className="lc-btn-outline">
                <Clock size={15} /> View Order History
              </Link>
              <Link to="/wishlist" className="lc-btn-outline">
                Saved Equipment Wishlist
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="lc-card p-4 mb-4">
            <h5 className="mb-3 d-flex align-items-center gap-2">
              <MapPin size={18} /> Saved Delivery Addresses ({addresses.length})
            </h5>
            <div className="row g-3 mb-4">
              {addresses.map((addr) => (
                <div key={addr.address_id} className="col-md-6">
                  <div className="p-3 rounded border h-100 d-flex flex-column justify-content-between" style={{ borderColor: 'var(--lc-border-color)' }}>
                    <div className="small">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong>{addr.full_name}</strong>
                        {addr.is_default && (
                          <span className="lc-badge lc-badge-success">Default</span>
                        )}
                      </div>
                      <div>{addr.line1}</div>
                      <div>
                        {addr.city}, {addr.state} {addr.postal_code}
                      </div>
                      <div className="lc-mono mt-1" style={{ color: 'var(--lc-text-muted)' }}>
                        {addr.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.address_id)}
                      className="btn btn-sm text-danger p-0 mt-2 align-self-start"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h6 className="mb-3 pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
              Add New Delivery Address
            </h6>
            <form onSubmit={addressForm.handleSubmit(handleAddAddress)}>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="lc-label">Full Name</label>
                  <input className="lc-input" {...addressForm.register('full_name')} />
                </div>
                <div className="col-md-6">
                  <label className="lc-label">Phone</label>
                  <input className="lc-input" {...addressForm.register('phone')} />
                </div>
                <div className="col-12">
                  <label className="lc-label">Street Address</label>
                  <input className="lc-input" {...addressForm.register('line1')} />
                </div>
                <div className="col-md-4">
                  <label className="lc-label">City</label>
                  <input className="lc-input" {...addressForm.register('city')} />
                </div>
                <div className="col-md-4">
                  <label className="lc-label">State</label>
                  <input className="lc-input" {...addressForm.register('state')} />
                </div>
                <div className="col-md-4">
                  <label className="lc-label">Postal Code</label>
                  <input className="lc-input" {...addressForm.register('postal_code')} />
                </div>
              </div>
              <button type="submit" className="lc-btn-primary mt-3">
                Save Address
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

