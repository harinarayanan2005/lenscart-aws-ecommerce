import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCartDrawerOpen } from '../../store/slices/uiSlice';
import { removeCartItem, updateCartItemQuantity } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';

export const CartDrawer: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isOpen = useAppSelector((s) => s.ui.isCartDrawerOpen);
  const { summary } = useAppSelector((s) => s.cart);

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1080 }}
      onClick={() => dispatch(setCartDrawerOpen(false))}
    >
      <aside
        className="position-fixed top-0 end-0 h-100 d-flex flex-column justify-content-between"
        style={{
          width: 'min(420px, 100vw)',
          backgroundColor: 'var(--lc-bg-surface)',
          borderLeft: '1px solid var(--lc-border-color)',
          boxShadow: 'var(--lc-shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-3 d-flex justify-content-between align-items-center border-bottom"
          style={{ borderColor: 'var(--lc-border-color)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <ShoppingBag size={18} />
            <h6 className="mb-0">Equipment Bag ({summary.item_count})</h6>
          </div>
          <button
            type="button"
            className="lc-btn-outline"
            style={{ padding: '0.35rem 0.55rem' }}
            onClick={() => dispatch(setCartDrawerOpen(false))}
            aria-label="Close cart drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 flex-grow-1 overflow-auto">
          {summary.items.length === 0 ? (
            <div className="text-center py-5">
              <ShoppingBag size={36} className="mb-2" style={{ color: 'var(--lc-text-muted)' }} />
              <p className="mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                Your camera bag is currently empty.
              </p>
              <button
                type="button"
                className="lc-btn-primary"
                onClick={() => {
                  dispatch(setCartDrawerOpen(false));
                  navigate('/catalogue');
                }}
              >
                Explore Equipment
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {summary.items.map((item) => (
                <div
                  key={item.item_id}
                  className="lc-card p-2 d-flex gap-3 align-items-center"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: 68,
                      height: 54,
                      objectFit: 'cover',
                      borderRadius: 'var(--lc-radius-sm)',
                    }}
                  />
                  <div className="flex-grow-1">
                    <div className="small fw-semibold">{item.name}</div>
                    <div className="small lc-mono" style={{ color: 'var(--lc-text-secondary)' }}>
                      {formatCurrency(item.final_unit_price)} × {item.quantity}
                    </div>
                    {item.stock_warning && (
                      <div className="small text-danger">{item.stock_warning}</div>
                    )}
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <button
                        type="button"
                        className="lc-btn-outline"
                        style={{ padding: '0.15rem 0.45rem' }}
                        onClick={() =>
                          dispatch(
                            updateCartItemQuantity({
                              itemId: item.item_id,
                              quantity: item.quantity - 1,
                            })
                          )
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <span className="small lc-mono">{item.quantity}</span>
                      <button
                        type="button"
                        className="lc-btn-outline"
                        style={{ padding: '0.15rem 0.45rem' }}
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
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm ms-auto text-danger p-0"
                        onClick={() => dispatch(removeCartItem(item.item_id))}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {summary.items.length > 0 && (
          <div
            className="p-3 border-top"
            style={{ borderColor: 'var(--lc-border-color)', backgroundColor: 'var(--lc-bg-subtle)' }}
          >
            <div className="d-flex justify-content-between small mb-1">
              <span>Subtotal</span>
              <span className="lc-mono">{formatCurrency(summary.subtotal)}</span>
            </div>
            {summary.discount_total > 0 && (
              <div className="d-flex justify-content-between small mb-1 text-success">
                <span>Savings</span>
                <span className="lc-mono">-{formatCurrency(summary.discount_total)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between fw-semibold mb-3">
              <span>Estimated Total</span>
              <span className="lc-mono">{formatCurrency(summary.final_total)}</span>
            </div>
            <div className="d-grid gap-2">
              <Link
                to="/checkout"
                className="lc-btn-accent text-center"
                onClick={() => dispatch(setCartDrawerOpen(false))}
              >
                Proceed to Checkout
              </Link>
              <Link
                to="/cart"
                className="lc-btn-outline text-center"
                onClick={() => dispatch(setCartDrawerOpen(false))}
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

