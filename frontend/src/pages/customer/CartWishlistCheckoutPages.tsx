import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  CreditCard,
  Heart,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  addToCart,
  fetchCart,
  removeCartItem,
  updateCartItemQuantity,
} from '../../store/slices/cartSlice';
import { fetchWishlist, removeWishlistItem } from '../../store/slices/wishlistSlice';
import { addToast } from '../../store/slices/uiSlice';
import { authApi, extractErrorMessage, orderApi } from '../../services/api';
import type { Address, Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AddressFormValues, addressSchema } from '../../utils/validation';
import { PriceTag, StockBadge } from '../../components/common/CommonWidgets';

export const CartPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { summary, loading } = useAppSelector((s) => s.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Order Preparation
        </span>
        <h1 className="h2 mb-0">Equipment Shopping Cart ({summary.item_count})</h1>
      </div>

      {loading && summary.items.length === 0 ? (
        <div className="lc-card p-5 text-center">Validating live stock and pricing...</div>
      ) : summary.items.length === 0 ? (
        <div className="lc-card p-5 text-center">
          <ShoppingBag size={40} className="mb-3" style={{ color: 'var(--lc-text-muted)' }} />
          <h4>Your equipment bag is empty</h4>
          <p className="small mb-4" style={{ color: 'var(--lc-text-secondary)' }}>
            Browse our mirrorless bodies, prime lenses, carbon tripods, and lighting kits.
          </p>
          <Link to="/catalogue" className="lc-btn-primary">
            Browse Equipment Catalogue
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="d-flex flex-column gap-3">
              {summary.items.map((item) => (
                <div key={item.item_id} className="lc-card p-3">
                  <div className="row align-items-center g-3">
                    <div className="col-3 col-sm-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-100 rounded"
                        style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="col-9 col-sm-5">
                      <div className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)', fontSize: '0.72rem' }}>
                        {item.brand} · {item.category_name}
                      </div>
                      <Link
                        to={`/products/${encodeURIComponent(item.product_id)}`}
                        className="fw-semibold d-block mb-1"
                      >
                        {item.name}
                      </Link>
                      <PriceTag
                        price={item.unit_price}
                        discountPercent={item.discount_percent}
                        finalPrice={item.final_unit_price}
                        size="sm"
                      />
                      {item.stock_warning && (
                        <div className="small text-danger mt-1">{item.stock_warning}</div>
                      )}
                    </div>
                    <div className="col-6 col-sm-3 d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="lc-btn-outline"
                        style={{ padding: '0.3rem 0.6rem' }}
                        onClick={() =>
                          dispatch(
                            updateCartItemQuantity({
                              itemId: item.item_id,
                              quantity: item.quantity - 1,
                            })
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span className="lc-mono fw-semibold px-2">{item.quantity}</span>
                      <button
                        type="button"
                        className="lc-btn-outline"
                        style={{ padding: '0.3rem 0.6rem' }}
                        disabled={item.quantity >= item.available_qty}
                        onClick={() =>
                          dispatch(
                            updateCartItemQuantity({
                              itemId: item.item_id,
                              quantity: item.quantity + 1,
                            })
                          )
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="col-6 col-sm-2 text-end">
                      <div className="lc-mono fw-semibold mb-1">
                        {formatCurrency(item.line_total)}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm text-danger p-0"
                        onClick={() => dispatch(removeCartItem(item.item_id))}
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="lc-card p-4">
              <h5 className="mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
                Order Summary
              </h5>
              <div className="d-flex justify-content-between small mb-2">
                <span>Retail Subtotal</span>
                <span className="lc-mono">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-2 text-success">
                <span>Instant Rebates & Discounts</span>
                <span className="lc-mono">-{formatCurrency(summary.discount_total)}</span>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span>Insured Courier Shipping</span>
                <span className="lc-mono">
                  {summary.shipping_fee === 0 ? 'FREE' : formatCurrency(summary.shipping_fee)}
                </span>
              </div>
              <div className="d-flex justify-content-between small mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
                <span>Estimated Tax (8%)</span>
                <span className="lc-mono">{formatCurrency(summary.tax_amount)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold h5 mb-4">
                <span>Final Total</span>
                <span className="lc-mono">{formatCurrency(summary.final_total)}</span>
              </div>

              <Link
                to="/checkout"
                className={`lc-btn-accent w-100 ${summary.has_stock_issues ? 'disabled' : ''}`}
              >
                Proceed to Secure Checkout
              </Link>
              <Link to="/catalogue" className="lc-btn-outline w-100 mt-2">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleMoveToCart = async (productId: string, name: string) => {
    const res = await dispatch(addToCart({ productId, quantity: 1 }));
    if (addToCart.fulfilled.match(res)) {
      await dispatch(removeWishlistItem(productId));
      dispatch(addToast({ type: 'success', message: `Moved ${name} to your shopping cart.` }));
    } else {
      dispatch(addToast({ type: 'error', message: (res.payload as string) || 'Failed moving item' }));
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Saved Gear
        </span>
        <h1 className="h2 mb-0">Equipment Wishlist ({items.length})</h1>
      </div>

      {loading && items.length === 0 ? (
        <div className="lc-card p-5 text-center">Loading saved equipment...</div>
      ) : items.length === 0 ? (
        <div className="lc-card p-5 text-center">
          <Heart size={40} className="mb-3" style={{ color: 'var(--lc-text-muted)' }} />
          <h4>Your wishlist is empty</h4>
          <p className="small mb-4" style={{ color: 'var(--lc-text-secondary)' }}>
            Save cameras, lenses, and accessories while planning your next kit.
          </p>
          <Link to="/catalogue" className="lc-btn-primary">
            Explore Catalogue
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {items.map(({ product_id, product }) => (
            <div key={product_id} className="col-sm-6 col-lg-4">
              <div className="lc-card p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-uppercase fw-semibold" style={{ color: 'var(--lc-text-muted)' }}>
                      {product.brand}
                    </span>
                    <StockBadge availableQty={product.available_qty} />
                  </div>
                  <Link to={`/products/${encodeURIComponent(product_id)}`}>
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-100 rounded mb-3"
                      style={{ height: 190, objectFit: 'cover' }}
                    />
                    <h5 className="h6 mb-2">{product.name}</h5>
                  </Link>
                  <PriceTag
                    price={product.price}
                    discountPercent={product.discount_percent}
                    finalPrice={product.final_price}
                    size="sm"
                  />
                </div>
                <div className="d-flex gap-2 mt-3 pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
                  <button
                    type="button"
                    className="lc-btn-primary flex-grow-1"
                    disabled={product.available_qty <= 0}
                    onClick={() => handleMoveToCart(product_id, product.name)}
                  >
                    <ShoppingBag size={15} /> Move to Cart
                  </button>
                  <button
                    type="button"
                    className="lc-btn-outline text-danger"
                    onClick={() => dispatch(removeWishlistItem(product_id))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { summary } = useAppSelector((s) => s.cart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    'SIMULATED_CARD' | 'SIMULATED_UPI' | 'SIMULATED_NETBANKING'
  >('SIMULATED_CARD');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'United States',
      is_default: true,
    },
  });

  useEffect(() => {
    dispatch(fetchCart());
    authApi.getAddresses().then((list) => {
      setAddresses(list);
      if (list.length > 0) {
        const def = list.find((a) => a.is_default) || list[0];
        setSelectedAddressId(def.address_id);
      } else {
        setShowNewAddressForm(true);
      }
    });
  }, [dispatch]);

  const handleSaveAddress = async (values: AddressFormValues) => {
    try {
      const created = await authApi.createAddress(values);
      setAddresses([created, ...addresses]);
      setSelectedAddressId(created.address_id);
      setShowNewAddressForm(false);
      addressForm.reset();
      dispatch(addToast({ type: 'success', message: 'Delivery address saved.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      dispatch(addToast({ type: 'warning', message: 'Please select or add a delivery address.' }));
      return;
    }
    setPlacingOrder(true);
    try {
      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const order = await orderApi.createOrder({
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      });
      setConfirmedOrder(order);
      dispatch(fetchCart());
      dispatch(
        addToast({
          type: 'success',
          message: `Order ${order.order_id} placed and confirmed!`,
        })
      );
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="lc-card p-4 p-md-5 text-center">
              <CheckCircle2 size={52} color="var(--lc-success)" className="mb-3" />
              <span className="lc-badge lc-badge-success mb-2">
                SIMULATED PAYMENT VERIFIED · SQS PROCESSED
              </span>
              <h2 className="mb-2">Thank You for Your Order!</h2>
              <p className="mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                Order ID: <strong className="lc-mono">{confirmedOrder.order_id}</strong> · Payment
                Ref: <strong className="lc-mono">{confirmedOrder.payment_reference}</strong>
              </p>

              <div
                className="p-3 rounded text-start mb-4"
                style={{ backgroundColor: 'var(--lc-bg-subtle)' }}
              >
                <div className="row g-3 small">
                  <div className="col-md-6">
                    <div className="fw-bold text-uppercase mb-1" style={{ color: 'var(--lc-text-muted)' }}>
                      Delivery Destination
                    </div>
                    <div>{confirmedOrder.shipping_address.full_name}</div>
                    <div>{confirmedOrder.shipping_address.line1}</div>
                    <div>
                      {confirmedOrder.shipping_address.city}, {confirmedOrder.shipping_address.state}{' '}
                      {confirmedOrder.shipping_address.postal_code}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="fw-bold text-uppercase mb-1" style={{ color: 'var(--lc-text-muted)' }}>
                      Order Status & Total
                    </div>
                    <div>
                      Current Status:{' '}
                      <span className="lc-badge lc-badge-info">{confirmedOrder.order_status}</span>
                    </div>
                    <div className="mt-1">
                      Total Charged:{' '}
                      <strong className="lc-mono">
                        {formatCurrency(confirmedOrder.final_total)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <button
                  type="button"
                  className="lc-btn-primary"
                  onClick={() => navigate(`/orders/${encodeURIComponent(confirmedOrder.order_id)}`)}
                >
                  Track Order Timeline
                </button>
                <Link to="/catalogue" className="lc-btn-outline">
                  Continue Exploring Gear
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Transactional Fulfillment
        </span>
        <h1 className="h2 mb-0">Secure Checkout</h1>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          {/* Step 1: Delivery Address */}
          <div className="lc-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <MapPin size={18} color="var(--lc-accent-primary)" /> 1. Delivery Address
              </h5>
              <button
                type="button"
                className="lc-btn-outline btn-sm"
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
              >
                {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
              </button>
            </div>

            {addresses.length > 0 && !showNewAddressForm && (
              <div className="d-flex flex-column gap-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.address_id}
                    className="p-3 rounded border d-flex align-items-start gap-3"
                    style={{
                      cursor: 'pointer',
                      borderColor:
                        selectedAddressId === addr.address_id
                          ? 'var(--lc-accent-primary)'
                          : 'var(--lc-border-color)',
                      backgroundColor:
                        selectedAddressId === addr.address_id
                          ? 'var(--lc-accent-subtle)'
                          : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="delivery_address"
                      checked={selectedAddressId === addr.address_id}
                      onChange={() => setSelectedAddressId(addr.address_id)}
                      className="mt-1"
                    />
                    <div className="small">
                      <div className="fw-semibold">
                        {addr.full_name} · <span className="lc-mono">{addr.phone}</span>
                      </div>
                      <div style={{ color: 'var(--lc-text-secondary)' }}>
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state}{' '}
                        {addr.postal_code}, {addr.country}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showNewAddressForm && (
              <form onSubmit={addressForm.handleSubmit(handleSaveAddress)} className="mt-2">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="lc-label">Recipient Full Name</label>
                    <input className="lc-input" {...addressForm.register('full_name')} />
                  </div>
                  <div className="col-md-6">
                    <label className="lc-label">Phone Number</label>
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
                  Save Delivery Address
                </button>
              </form>
            )}
          </div>

          {/* Step 2: Simulated Payment */}
          <div className="lc-card p-4">
            <h5 className="mb-2 d-flex align-items-center gap-2">
              <CreditCard size={18} color="var(--lc-accent-primary)" /> 2. Simulated Payment Method
            </h5>
            <p className="small mb-3" style={{ color: 'var(--lc-text-muted)' }}>
              <Lock size={13} className="me-1" />
              Sandbox Simulation Mode: No real credit card or banking credentials are collected or
              stored.
            </p>

            <div className="d-flex flex-column gap-2">
              {[
                {
                  id: 'SIMULATED_CARD',
                  label: 'Simulated Studio Corporate Card (Instant Authorization)',
                },
                {
                  id: 'SIMULATED_UPI',
                  label: 'Simulated Instant Digital Transfer / UPI',
                },
                {
                  id: 'SIMULATED_NETBANKING',
                  label: 'Simulated Direct Wire / NetBanking',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="p-3 rounded border d-flex align-items-center gap-2 small fw-medium"
                  style={{
                    cursor: 'pointer',
                    borderColor:
                      paymentMethod === opt.id
                        ? 'var(--lc-accent-primary)'
                        : 'var(--lc-border-color)',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === opt.id}
                    onChange={() =>
                      setPaymentMethod(
                        opt.id as 'SIMULATED_CARD' | 'SIMULATED_UPI' | 'SIMULATED_NETBANKING'
                      )
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Review & Submit */}
        <div className="col-lg-5">
          <div className="lc-card p-4">
            <h5 className="mb-3">3. Review Equipment & Place Order</h5>
            <div className="d-flex flex-column gap-2 mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
              {summary.items.map((item) => (
                <div key={item.item_id} className="d-flex justify-content-between small">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span className="lc-mono fw-semibold">{formatCurrency(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-between small mb-1">
              <span>Subtotal</span>
              <span className="lc-mono">{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between small mb-1 text-success">
              <span>Discounts</span>
              <span className="lc-mono">-{formatCurrency(summary.discount_total)}</span>
            </div>
            <div className="d-flex justify-content-between small mb-1">
              <span>Shipping</span>
              <span className="lc-mono">
                {summary.shipping_fee === 0 ? 'FREE' : formatCurrency(summary.shipping_fee)}
              </span>
            </div>
            <div className="d-flex justify-content-between small mb-3">
              <span>Estimated Tax</span>
              <span className="lc-mono">{formatCurrency(summary.tax_amount)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold h5 pt-2 border-top mb-4" style={{ borderColor: 'var(--lc-border-color)' }}>
              <span>Authoritative Total</span>
              <span className="lc-mono">{formatCurrency(summary.final_total)}</span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder || summary.items.length === 0 || summary.has_stock_issues}
              className="lc-btn-accent w-100"
            >
              {placingOrder ? 'Reserving Inventory & Placing Order...' : 'Place Order (Simulated Payment)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

