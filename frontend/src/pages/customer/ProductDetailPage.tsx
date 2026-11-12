import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowLeftRight,
  Box,
  CheckCircle2,
  Heart,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchProductDetail } from '../../store/slices/productSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { addWishlistItem, removeWishlistItem } from '../../store/slices/wishlistSlice';
import { toggleCompareProduct } from '../../store/slices/comparisonSlice';
import { addToast, setCartDrawerOpen } from '../../store/slices/uiSlice';
import { catalogApi, extractErrorMessage } from '../../services/api';
import type { Review } from '../../types';
import {
  formatDate,
  formatSpecLabel,
  formatSpecValue,
} from '../../utils/formatters';
import { ReviewFormValues, reviewSchema } from '../../utils/validation';
import { PriceTag, RatingStars, StockBadge } from '../../components/common/CommonWidgets';
import { ProductCard } from '../../components/products/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { selectedProduct: product, compatibleProducts, loading } = useAppSelector(
    (s) => s.products
  );
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const wishlistItems = useAppSelector((s) => s.wishlist.items);
  const comparedProducts = useAppSelector((s) => s.comparison.comparedProducts);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const decodedId = productId ? decodeURIComponent(productId) : '';

  useEffect(() => {
    if (decodedId) {
      setActiveImageIdx(0);
      setQuantity(1);
      dispatch(fetchProductDetail(decodedId));
      catalogApi
        .getReviews(decodedId)
        .then(setReviews)
        .catch(() => setReviews([]));
    }
  }, [decodedId, dispatch]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, title: '', comment: '' },
  });

  if (loading || !product) {
    return (
      <div className="container py-5">
        <div className="lc-card p-5 text-center">
          {loading ? 'Loading technical specifications...' : 'Product not found.'}
        </div>
      </div>
    );
  }

  const isWishlisted = wishlistItems.some((w) => w.product_id === product.product_id);
  const isCompared = comparedProducts.some((p) => p.product_id === product.product_id);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      dispatch(addToast({ type: 'info', message: 'Please sign in to add items to your cart.' }));
      navigate('/login');
      return;
    }
    const res = await dispatch(addToCart({ productId: product.product_id, quantity }));
    if (addToCart.fulfilled.match(res)) {
      dispatch(
        addToast({
          type: 'success',
          message: `Added ${quantity} × ${product.name} to your equipment bag.`,
        })
      );
      dispatch(setCartDrawerOpen(true));
    } else {
      dispatch(addToast({ type: 'error', message: (res.payload as string) || 'Error adding item' }));
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isWishlisted) {
      await dispatch(removeWishlistItem(product.product_id));
      dispatch(addToast({ type: 'info', message: 'Removed from wishlist.' }));
    } else {
      await dispatch(addWishlistItem(product.product_id));
      dispatch(addToast({ type: 'success', message: 'Saved to your wishlist.' }));
    }
  };

  const onSubmitReview = async (values: ReviewFormValues) => {
    setSubmittingReview(true);
    try {
      const created = await catalogApi.createReview(product.product_id, values);
      setReviews([created, ...reviews]);
      dispatch(fetchProductDetail(product.product_id));
      reset();
      dispatch(addToast({ type: 'success', message: 'Thank you for reviewing this equipment!' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-3">
        <Link to="/catalogue" className="small d-inline-flex align-items-center gap-1" style={{ color: 'var(--lc-text-secondary)' }}>
          <ArrowLeft size={14} /> Back to Equipment Catalogue
        </Link>
      </div>

      {/* Main Product Hero */}
      <div className="row g-4 mb-5">
        <div className="col-lg-6">
          <div className="lc-card p-3">
            <div
              className="rounded overflow-hidden mb-3"
              style={{ aspectRatio: '4/3', backgroundColor: 'var(--lc-bg-subtle)' }}
            >
              <img
                src={
                  product.images?.[activeImageIdx] ||
                  product.images?.[0] ||
                  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80'
                }
                alt={product.name}
                className="w-100 h-100"
                style={{ objectFit: 'cover' }}
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="d-flex gap-2">
                {product.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className="p-0 border rounded overflow-hidden"
                    style={{
                      width: 76,
                      height: 58,
                      borderColor:
                        idx === activeImageIdx
                          ? 'var(--lc-accent-primary)'
                          : 'var(--lc-border-color)',
                      borderWidth: idx === activeImageIdx ? 2 : 1,
                    }}
                  >
                    <img src={imgUrl} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="lc-card p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)', letterSpacing: '0.06em' }}>
                  {product.brand} · {product.category_name}
                </span>
                <span className="small lc-mono" style={{ color: 'var(--lc-text-muted)' }}>
                  SKU: {product.sku}
                </span>
              </div>

              <h1 className="h3 mb-2">{product.name}</h1>

              <div className="d-flex align-items-center gap-3 mb-3">
                <RatingStars rating={product.rating_avg} reviewCount={product.review_count} />
                <StockBadge
                  availableQty={product.available_qty}
                  lowStockThreshold={product.low_stock_threshold}
                />
                {product.lens_mount && (
                  <span className="lc-badge lc-badge-neutral">Mount: {product.lens_mount}</span>
                )}
              </div>

              <div className="mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
                <PriceTag
                  price={product.price}
                  discountPercent={product.discount_percent}
                  finalPrice={product.final_price}
                  size="lg"
                />
              </div>

              <p className="mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                {product.description}
              </p>

              {/* Warranty & In-The-Box Highlights */}
              <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--lc-bg-subtle)' }}>
                <div className="d-flex align-items-center gap-2 small fw-semibold mb-2">
                  <ShieldCheck size={16} color="var(--lc-success)" />
                  <span>{product.warranty_info}</span>
                </div>
                {product.in_the_box && product.in_the_box.length > 0 && (
                  <div className="small" style={{ color: 'var(--lc-text-secondary)' }}>
                    <strong className="d-inline-flex align-items-center gap-1 me-1">
                      <Box size={14} /> In the Box:
                    </strong>
                    {product.in_the_box.join(' · ')}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Actions */}
            <div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="d-flex align-items-center">
                  <label htmlFor="qty-select" className="small me-2 fw-semibold">
                    Qty:
                  </label>
                  <select
                    id="qty-select"
                    className="lc-select"
                    style={{ width: 80 }}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={product.available_qty <= 0}
                  >
                    {Array.from(
                      { length: Math.min(10, Math.max(1, product.available_qty)) },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.available_qty <= 0}
                  className="lc-btn-accent flex-grow-1"
                >
                  <ShoppingBag size={16} />
                  {product.available_qty > 0 ? 'Add to Equipment Bag' : 'Out of Stock'}
                </button>

                <button
                  type="button"
                  onClick={handleWishlist}
                  className="lc-btn-outline"
                  aria-label="Save to Wishlist"
                >
                  <Heart
                    size={16}
                    fill={isWishlisted ? 'var(--lc-accent-primary)' : 'transparent'}
                    color={isWishlisted ? 'var(--lc-accent-primary)' : 'var(--lc-text-primary)'}
                  />
                  {isWishlisted ? 'Saved' : 'Wishlist'}
                </button>

                <button
                  type="button"
                  onClick={() => dispatch(toggleCompareProduct(product))}
                  className="lc-btn-outline"
                >
                  <ArrowLeftRight size={16} />
                  {isCompared ? 'Comparing' : 'Compare'}
                </button>
              </div>

              {(product.category_slug === 'cameras' || product.category_slug === 'lenses') && (
                <Link
                  to={`/compatibility?product_id=${encodeURIComponent(product.product_id)}`}
                  className="lc-btn-outline w-100"
                >
                  <SlidersHorizontal size={15} /> Check Compatible Lenses & Bodies for{' '}
                  {product.lens_mount}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category-Specific Technical Specifications */}
      <div className="row g-4 mb-5">
        <div className="col-lg-7">
          <div className="lc-card p-4 h-100">
            <h4 className="mb-3">Technical Specifications ({product.category_name})</h4>
            <table className="lc-spec-table">
              <tbody>
                {Object.entries(product.specifications || {}).map(([key, value]) => (
                  <tr key={key}>
                    <th>{formatSpecLabel(key)}</th>
                    <td>{formatSpecValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Reviews */}
        <div className="col-lg-5">
          <div className="lc-card p-4 h-100">
            <h4 className="mb-3">Verified Photographer Reviews ({reviews.length})</h4>

            <div className="d-flex flex-column gap-3 mb-4">
              {reviews.length === 0 ? (
                <p className="small" style={{ color: 'var(--lc-text-muted)' }}>
                  No customer reviews yet. Be the first to share field feedback on this product.
                </p>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.review_id}
                    className="p-3 rounded border"
                    style={{ borderColor: 'var(--lc-border-color)' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <RatingStars rating={rev.rating} />
                      <span className="small" style={{ color: 'var(--lc-text-muted)' }}>
                        {formatDate(rev.created_at)}
                      </span>
                    </div>
                    <div className="fw-semibold small mb-1">{rev.title}</div>
                    <p className="small mb-2" style={{ color: 'var(--lc-text-secondary)' }}>
                      {rev.comment}
                    </p>
                    <div className="small d-flex align-items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--lc-text-muted)' }}>
                      <span>{rev.user_name}</span>
                      {rev.verified_purchase && (
                        <span className="text-success d-inline-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> Verified Owner
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleSubmit(onSubmitReview)} className="pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
                <h6 className="mb-2">Write a Technical Review</h6>
                <div className="row g-2">
                  <div className="col-4">
                    <label className="lc-label">Rating</label>
                    <select className="lc-select" {...register('rating')}>
                      <option value={5}>5 ★ - Reference</option>
                      <option value={4}>4 ★ - Excellent</option>
                      <option value={3}>3 ★ - Capable</option>
                      <option value={2}>2 ★ - Subpar</option>
                      <option value={1}>1 ★ - Defective</option>
                    </select>
                  </div>
                  <div className="col-8">
                    <label className="lc-label">Headline</label>
                    <input
                      type="text"
                      className="lc-input"
                      placeholder="e.g. Tack-sharp wide open"
                      {...register('title')}
                    />
                    {errors.title && (
                      <div className="text-danger small">{errors.title.message}</div>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="lc-label">Field Impressions</label>
                    <textarea
                      rows={3}
                      className="lc-input"
                      placeholder="Share autofocus speed, build quality, or optical performance..."
                      {...register('comment')}
                    />
                    {errors.comment && (
                      <div className="text-danger small">{errors.comment.message}</div>
                    )}
                  </div>
                </div>
                <button type="submit" className="lc-btn-primary mt-2 w-100" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="small pt-2 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
                <Link to="/login" style={{ color: 'var(--lc-accent-primary)' }}>
                  Sign in
                </Link>{' '}
                to submit a verified equipment review.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compatible Accessories & Lenses */}
      {compatibleProducts.length > 0 && (
        <div className="pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
          <h3 className="h4 mb-3">Verified Compatible Optics & Accessories</h3>
          <div className="row g-4">
            {compatibleProducts.map((cp) => (
              <div key={cp.product_id} className="col-sm-6 col-lg-3">
                <ProductCard product={cp} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

