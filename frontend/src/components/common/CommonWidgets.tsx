import React, { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Moon,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { removeToast, toggleTheme } from '../../store/slices/uiSlice';
import { formatCurrency } from '../../utils/formatters';

export const ThemeToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className="lc-btn-outline"
      style={{ padding: '0.45rem 0.65rem' }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

export const PriceTag: React.FC<{
  price: number;
  discountPercent?: number;
  finalPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ price, discountPercent = 0, finalPrice, size = 'md' }) => {
  const effectiveFinal =
    finalPrice !== undefined
      ? finalPrice
      : Number((price * (1 - discountPercent / 100)).toFixed(2));

  const fontSize = size === 'lg' ? '1.65rem' : size === 'sm' ? '0.95rem' : '1.15rem';

  return (
    <div className="d-inline-flex align-items-baseline gap-2 flex-wrap">
      <span className="lc-mono fw-semibold" style={{ fontSize, color: 'var(--lc-text-primary)' }}>
        {formatCurrency(effectiveFinal)}
      </span>
      {discountPercent > 0 && (
        <>
          <span
            className="lc-mono text-decoration-line-through"
            style={{ fontSize: '0.84rem', color: 'var(--lc-text-muted)' }}
          >
            {formatCurrency(price)}
          </span>
          <span className="lc-badge lc-badge-danger">-{discountPercent}%</span>
        </>
      )}
    </div>
  );
};

export const StockBadge: React.FC<{
  availableQty: number;
  lowStockThreshold?: number;
}> = ({ availableQty, lowStockThreshold = 5 }) => {
  if (availableQty <= 0) {
    return <span className="lc-badge lc-badge-danger">Out of Stock</span>;
  }
  if (availableQty <= lowStockThreshold) {
    return <span className="lc-badge lc-badge-warning">Low Stock ({availableQty} left)</span>;
  }
  return <span className="lc-badge lc-badge-success">In Stock ({availableQty})</span>;
};

export const RatingStars: React.FC<{
  rating: number;
  reviewCount?: number;
  size?: number;
}> = ({ rating, reviewCount, size = 14 }) => {
  const rounded = Math.round(rating * 10) / 10;
  return (
    <div className="d-inline-flex align-items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= Math.round(rating) ? '#e59819' : 'transparent'}
          color={star <= Math.round(rating) ? '#e59819' : 'var(--lc-border-strong)'}
        />
      ))}
      <span className="ms-1 small fw-medium" style={{ color: 'var(--lc-text-secondary)' }}>
        {rounded.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className="small" style={{ color: 'var(--lc-text-muted)' }}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Catalogue pagination" className="d-flex justify-content-center mt-4">
      <div className="d-inline-flex align-items-center gap-2">
        <button
          type="button"
          className="lc-btn-outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={p === page ? 'lc-btn-primary' : 'lc-btn-outline'}
            style={{ minWidth: '40px', padding: '0.5rem 0.75rem' }}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="lc-btn-outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};

export const ToastContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((s) => s.ui.toasts);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      dispatch(removeToast(toasts[0].id));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="lc-toast-stack" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const icon =
          t.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--lc-success)" />
          ) : t.type === 'error' ? (
            <AlertCircle size={18} color="var(--lc-danger)" />
          ) : (
            <Info size={18} color="var(--lc-info)" />
          );
        return (
          <div
            key={t.id}
            className="lc-card p-3 d-flex align-items-center justify-content-between gap-3"
            style={{
              boxShadow: 'var(--lc-shadow-md)',
              borderLeft: `4px solid ${
                t.type === 'success'
                  ? 'var(--lc-success)'
                  : t.type === 'error'
                  ? 'var(--lc-danger)'
                  : 'var(--lc-info)'
              }`,
            }}
          >
            <div className="d-flex align-items-center gap-2">
              {icon}
              <span className="small fw-medium">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dispatch(removeToast(t.id))}
              className="btn btn-sm p-0"
              style={{ color: 'var(--lc-text-muted)' }}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

