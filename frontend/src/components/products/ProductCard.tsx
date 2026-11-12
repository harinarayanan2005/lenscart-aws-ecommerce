import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { addToCart } from '../../store/slices/cartSlice';
import { addWishlistItem, removeWishlistItem } from '../../store/slices/wishlistSlice';
import { toggleCompareProduct } from '../../store/slices/comparisonSlice';
import { addToast, setCartDrawerOpen } from '../../store/slices/uiSlice';
import { PriceTag, RatingStars, StockBadge } from '../common/CommonWidgets';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const wishlistItems = useAppSelector((s) => s.wishlist.items);
  const comparedProducts = useAppSelector((s) => s.comparison.comparedProducts);

  const isWishlisted = wishlistItems.some((w) => w.product_id === product.product_id);
  const isCompared = comparedProducts.some((p) => p.product_id === product.product_id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      dispatch(addToast({ type: 'info', message: 'Please sign in to add equipment to your cart.' }));
      navigate('/login');
      return;
    }
    const result = await dispatch(addToCart({ productId: product.product_id, quantity: 1 }));
    if (addToCart.fulfilled.match(result)) {
      dispatch(addToast({ type: 'success', message: `${product.name} added to cart.` }));
      dispatch(setCartDrawerOpen(true));
    } else {
      dispatch(
        addToast({
          type: 'error',
          message: (result.payload as string) || 'Unable to add item to cart.',
        })
      );
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      dispatch(addToast({ type: 'info', message: 'Please sign in to save items to your wishlist.' }));
      navigate('/login');
      return;
    }
    if (isWishlisted) {
      await dispatch(removeWishlistItem(product.product_id));
      dispatch(addToast({ type: 'info', message: `Removed ${product.name} from wishlist.` }));
    } else {
      await dispatch(addWishlistItem(product.product_id));
      dispatch(addToast({ type: 'success', message: `Saved ${product.name} to wishlist.` }));
    }
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isCompared && comparedProducts.length >= 4) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'You can compare up to 4 products at a time.',
        })
      );
      return;
    }
    dispatch(toggleCompareProduct(product));
    dispatch(
      addToast({
        type: 'info',
        message: isCompared
          ? `Removed ${product.name} from comparison.`
          : `Added ${product.name} to comparison tray.`,
      })
    );
  };

  return (
    <div className="lc-card lc-card-interactive h-100 d-flex flex-column">
      <Link to={`/products/${encodeURIComponent(product.product_id)}`} className="lc-product-img-wrap">
        <img
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'}
          alt={product.name}
          loading="lazy"
        />
        <div
          className="position-absolute top-0 start-0 p-2 d-flex flex-column gap-1"
          style={{ zIndex: 2 }}
        >
          {product.is_new_arrival && <span className="lc-badge lc-badge-info">New</span>}
          {product.discount_percent > 0 && (
            <span className="lc-badge lc-badge-danger">Save {product.discount_percent}%</span>
          )}
          {product.lens_mount && (
            <span className="lc-badge lc-badge-neutral">{product.lens_mount}</span>
          )}
        </div>
        <div
          className="position-absolute top-0 end-0 p-2 d-flex flex-column gap-1"
          style={{ zIndex: 2 }}
        >
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="lc-btn-outline"
            style={{
              padding: '0.4rem',
              backgroundColor: 'var(--lc-bg-surface)',
              borderColor: isWishlisted ? 'var(--lc-accent-primary)' : 'var(--lc-border-color)',
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            title="Wishlist"
          >
            <Heart
              size={15}
              fill={isWishlisted ? 'var(--lc-accent-primary)' : 'transparent'}
              color={isWishlisted ? 'var(--lc-accent-primary)' : 'var(--lc-text-primary)'}
            />
          </button>
          <button
            type="button"
            onClick={handleToggleCompare}
            className="lc-btn-outline"
            style={{
              padding: '0.4rem',
              backgroundColor: isCompared ? 'var(--lc-dark-btn)' : 'var(--lc-bg-surface)',
              color: isCompared ? 'var(--lc-dark-btn-text)' : 'var(--lc-text-primary)',
            }}
            aria-label="Compare specifications"
            title="Compare specifications"
          >
            <ArrowLeftRight size={15} />
          </button>
        </div>
      </Link>

      <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
        <div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span
              className="text-uppercase fw-semibold"
              style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--lc-text-muted)' }}
            >
              {product.brand} · {product.category_name}
            </span>
            <StockBadge
              availableQty={product.available_qty}
              lowStockThreshold={product.low_stock_threshold}
            />
          </div>

          <Link to={`/products/${encodeURIComponent(product.product_id)}`}>
            <h5 className="mb-1" style={{ fontSize: '1.02rem', lineHeight: 1.35 }}>
              {product.name}
            </h5>
          </Link>

          <p
            className="small mb-2"
            style={{
              color: 'var(--lc-text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.short_description}
          </p>
        </div>

        <div className="pt-2 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <PriceTag
              price={product.price}
              discountPercent={product.discount_percent}
              finalPrice={product.final_price}
              size="sm"
            />
            <RatingStars rating={product.rating_avg} reviewCount={product.review_count} />
          </div>

          <button
            type="button"
            className="lc-btn-primary w-100"
            disabled={product.available_qty <= 0}
            onClick={handleAddToCart}
          >
            <ShoppingBag size={15} />
            {product.available_qty > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

