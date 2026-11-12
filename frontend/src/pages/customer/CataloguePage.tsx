import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCategories, fetchProducts } from '../../store/slices/productSlice';
import { ProductCard } from '../../components/products/ProductCard';
import { Pagination } from '../../components/common/CommonWidgets';
import type { ProductFilterParams } from '../../types';

const BRANDS = [
  'Sony',
  'Canon',
  'Nikon',
  'Fujifilm',
  'Leica',
  'Sigma',
  'Peak Design',
  'Gitzo',
  'Manfrotto',
  'DJI',
  'Aputure',
  'Nanlite',
  'Godox',
  'Profoto',
  'Rode',
  'Sennheiser',
  'Zoom',
  'PolarPro',
  'SmallRig',
  'Tiffen',
  'SanDisk',
  'Samsung',
  'Pelican',
  'Shimoda',
];
const MOUNTS = ['Sony E', 'Canon RF', 'Nikon Z', 'Fujifilm X', 'L-Mount', 'Universal'];

export const CataloguePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items: products, categories, pagination, loading } = useAppSelector((s) => s.products);

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [lensMount, setLensMount] = useState(searchParams.get('lens_mount') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock_only') === 'true');
  const [onSale, setOnSale] = useState(searchParams.get('on_sale') === 'true');
  const [sortBy, setSortBy] = useState<ProductFilterParams['sort_by']>(
    (searchParams.get('sort_by') as ProductFilterParams['sort_by']) || 'popularity'
  );
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const queryQ = searchParams.get('q') || '';
    const queryCat = searchParams.get('category_id') || '';
    setQ(queryQ);
    setCategoryId(queryCat);
  }, [searchParams]);

  useEffect(() => {
    const params: ProductFilterParams = {
      q: q.trim() || undefined,
      category_id: categoryId || undefined,
      brand: brand || undefined,
      lens_mount: lensMount || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_rating: minRating ? Number(minRating) : undefined,
      in_stock_only: inStockOnly || undefined,
      on_sale: onSale || undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      is_new_arrival: searchParams.get('is_new_arrival') === 'true' ? true : undefined,
      is_best_seller: searchParams.get('is_best_seller') === 'true' ? true : undefined,
      sort_by: sortBy,
      page,
      page_size: 9,
    };
    dispatch(fetchProducts(params));
  }, [
    dispatch,
    q,
    categoryId,
    brand,
    lensMount,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    onSale,
    sortBy,
    page,
    searchParams,
  ]);

  const handleReset = () => {
    setQ('');
    setCategoryId('');
    setBrand('');
    setLensMount('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
    setOnSale(false);
    setSortBy('popularity');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)', letterSpacing: '0.08em' }}>
            Optical & Cinema Equipment
          </span>
          <h1 className="h2 mb-0">Equipment Catalogue</h1>
        </div>
        <div className="d-flex align-items-center gap-3 mt-3 mt-md-0">
          <span className="small" style={{ color: 'var(--lc-text-muted)' }}>
            Showing <strong>{products.length}</strong> of <strong>{pagination.total}</strong> items
          </span>
          <select
            className="lc-select"
            style={{ width: 'auto', minWidth: 190 }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as ProductFilterParams['sort_by']);
              setPage(1);
            }}
            aria-label="Sort products"
          >
            <option value="popularity">Sort: Popularity</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
            <option value="newest">Newest Releases</option>
          </select>
        </div>
      </div>

      <div className="row g-4">
        {/* Sidebar Filters */}
        <div className="col-lg-3">
          <div className="lc-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
              <span className="fw-semibold d-inline-flex align-items-center gap-2">
                <Filter size={15} /> Refine Equipment
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-sm p-0 d-inline-flex align-items-center gap-1"
                style={{ color: 'var(--lc-accent-primary)', fontSize: '0.8rem' }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            <div className="mb-3">
              <label className="lc-label">Keyword / SKU</label>
              <div className="position-relative">
                <input
                  type="text"
                  className="lc-input"
                  placeholder="e.g. a7R V, 24-70mm, CFexpress..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="lc-label">Category</label>
              <select
                className="lc-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories (8)</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name} ({c.product_count})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="lc-label">Brand</label>
              <select
                className="lc-select"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Brands</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="lc-label">Lens / Camera Mount</label>
              <select
                className="lc-select"
                value={lensMount}
                onChange={(e) => {
                  setLensMount(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Mount Systems</option>
                {MOUNTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="lc-label">Price Range ($ USD)</label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="lc-input"
                  placeholder="Min"
                  min={0}
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                />
                <input
                  type="number"
                  className="lc-input"
                  placeholder="Max"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="lc-label">Minimum Rating</label>
              <select
                className="lc-select"
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any Rating</option>
                <option value="4.8">4.8★ & Above</option>
                <option value="4.5">4.5★ & Above</option>
                <option value="4.0">4.0★ & Above</option>
              </select>
            </div>

            <div className="form-check mb-2">
              <input
                id="chk-instock"
                type="checkbox"
                className="form-check-input"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <label htmlFor="chk-instock" className="form-check-label small">
                In-Stock Equipment Only
              </label>
            </div>

            <div className="form-check">
              <input
                id="chk-onsale"
                type="checkbox"
                className="form-check-input"
                checked={onSale}
                onChange={(e) => {
                  setOnSale(e.target.checked);
                  setPage(1);
                }}
              />
              <label htmlFor="chk-onsale" className="form-check-label small">
                Special Rebates & Discounts
              </label>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="col-lg-9">
          {loading ? (
            <div className="lc-card p-5 text-center">Querying DynamoDB equipment index...</div>
          ) : products.length === 0 ? (
            <div className="lc-card p-5 text-center">
              <Search size={36} className="mb-2" style={{ color: 'var(--lc-text-muted)' }} />
              <h5>No matching equipment found</h5>
              <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                Try broadening your price range, clearing mount filters, or resetting search criteria.
              </p>
              <button type="button" onClick={handleReset} className="lc-btn-primary">
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {products.map((product) => (
                  <div key={product.product_id} className="col-sm-6 col-xl-4">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.total_pages}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

