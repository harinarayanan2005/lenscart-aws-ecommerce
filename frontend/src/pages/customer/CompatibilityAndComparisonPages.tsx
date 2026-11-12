import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, CheckCircle2, Compass, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchProducts } from '../../store/slices/productSlice';
import {
  clearComparison,
  removeFromCompare,
  toggleCompareProduct,
} from '../../store/slices/comparisonSlice';
import { catalogApi } from '../../services/api';
import type { Product } from '../../types';
import { formatSpecLabel, formatSpecValue } from '../../utils/formatters';
import { PriceTag, RatingStars, StockBadge } from '../../components/common/CommonWidgets';
import { ProductCard } from '../../components/products/ProductCard';

export const CompatibilityPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items: allProducts } = useAppSelector((s) => s.products);

  const cameras = allProducts.filter((p) => p.category_slug === 'cameras');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    searchParams.get('product_id') || 'PROD#cam-sony-a7rv'
  );
  const [compatResult, setCompatResult] = useState<{
    source_product: Product;
    lens_mount: string;
    compatible_lenses: Product[];
    compatible_accessories: Product[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allProducts.length === 0) {
      dispatch(fetchProducts({ page: 1, page_size: 40 }));
    }
  }, [allProducts.length, dispatch]);

  useEffect(() => {
    if (!selectedCameraId) return;
    setLoading(true);
    catalogApi
      .getCompatibleEquipment(selectedCameraId)
      .then((res) => setCompatResult(res))
      .finally(() => setLoading(false));
  }, [selectedCameraId]);

  return (
    <div className="container py-4">
      <div className="mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
          Structured Mount Verification (GSI3-LensMount)
        </span>
        <h1 className="h2 mb-1">Camera & Lens Compatibility Checker</h1>
        <p className="small mb-0" style={{ color: 'var(--lc-text-secondary)' }}>
          Select a camera body below to query DynamoDB for 100% native mount lenses and verified
          system accessories.
        </p>
      </div>

      <div className="lc-card p-4 mb-4">
        <div className="row align-items-center g-3">
          <div className="col-md-6">
            <label htmlFor="camera-selector" className="lc-label">
              Select Camera Body
            </label>
            <select
              id="camera-selector"
              className="lc-select"
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                setSearchParams({ product_id: e.target.value });
              }}
            >
              {cameras.map((cam) => (
                <option key={cam.product_id} value={cam.product_id}>
                  {cam.brand} — {cam.name} (Mount: {cam.lens_mount})
                </option>
              ))}
            </select>
          </div>

          {compatResult && (
            <div className="col-md-6">
              <div
                className="p-3 rounded d-flex align-items-center justify-content-between"
                style={{ backgroundColor: 'var(--lc-bg-subtle)' }}
              >
                <div>
                  <div className="small text-uppercase fw-bold" style={{ color: 'var(--lc-text-muted)' }}>
                    Detected Optical Mount
                  </div>
                  <div className="h5 mb-0 lc-mono">{compatResult.lens_mount}</div>
                  <div className="small text-success d-flex align-items-center gap-1 mt-1">
                    <CheckCircle2 size={14} /> {compatResult.compatible_lenses.length} Native Lenses
                    · {compatResult.compatible_accessories.length} Compatible Accessories
                  </div>
                </div>
                <Compass size={32} color="var(--lc-accent-primary)" />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="lc-card p-5 text-center">Resolving optical mount compatibility...</div>
      ) : (
        compatResult && (
          <>
            <h4 className="mb-3">
              Native {compatResult.lens_mount} Mount Lenses ({compatResult.compatible_lenses.length})
            </h4>
            <div className="row g-4 mb-5">
              {compatResult.compatible_lenses.map((lens) => (
                <div key={lens.product_id} className="col-sm-6 col-lg-4">
                  <ProductCard product={lens} />
                </div>
              ))}
            </div>

            {compatResult.compatible_accessories.length > 0 && (
              <>
                <h4 className="mb-3">
                  Compatible Support, Media & Audio Gear (
                  {compatResult.compatible_accessories.length})
                </h4>
                <div className="row g-4">
                  {compatResult.compatible_accessories.map((acc) => (
                    <div key={acc.product_id} className="col-sm-6 col-lg-3">
                      <ProductCard product={acc} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
};

export const ComparisonPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { comparedProducts } = useAppSelector((s) => s.comparison);
  const { items: catalogProducts } = useAppSelector((s) => s.products);

  useEffect(() => {
    if (catalogProducts.length === 0) {
      dispatch(fetchProducts({ page: 1, page_size: 30 }));
    }
  }, [catalogProducts.length, dispatch]);

  // Collect all unique technical specification keys across compared products
  const allSpecKeys: string[] = [];
  comparedProducts.forEach((p) => {
    Object.keys(p.specifications || {}).forEach((k) => {
      if (!allSpecKeys.includes(k)) allSpecKeys.push(k);
    });
  });

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div>
          <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
            Side-by-Side Technical Evaluation
          </span>
          <h1 className="h2 mb-0">Equipment Specification Comparison</h1>
        </div>
        {comparedProducts.length > 0 && (
          <button
            type="button"
            className="lc-btn-outline btn-sm text-danger"
            onClick={() => dispatch(clearComparison())}
          >
            <Trash2 size={14} /> Clear Comparison Tray
          </button>
        )}
      </div>

      {/* Quick Product Selector to Add to Comparison */}
      <div className="lc-card p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="small fw-medium">
          <SlidersHorizontal size={15} className="me-2" />
          Compare 2 to 4 items ({comparedProducts.length}/4 selected)
        </div>
        <select
          className="lc-select"
          style={{ width: 'auto', minWidth: 280 }}
          value=""
          onChange={(e) => {
            const found = catalogProducts.find((p) => p.product_id === e.target.value);
            if (found) dispatch(toggleCompareProduct(found));
          }}
        >
          <option value="">+ Add product to comparison table...</option>
          {catalogProducts
            .filter((cp) => !comparedProducts.some((x) => x.product_id === cp.product_id))
            .map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.brand} — {p.name} ({p.category_name})
              </option>
            ))}
        </select>
      </div>

      {comparedProducts.length === 0 ? (
        <div className="lc-card p-5 text-center">
          <ArrowLeftRight size={40} className="mb-3" style={{ color: 'var(--lc-text-muted)' }} />
          <h4>No equipment selected for comparison</h4>
          <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
            Select products using the dropdown above or click the Compare icon on any product card.
          </p>
          <Link to="/catalogue" className="lc-btn-primary">
            Browse Catalogue
          </Link>
        </div>
      ) : (
        <div className="lc-card overflow-auto">
          <table className="lc-spec-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Model / Overview</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id} style={{ minWidth: 230, verticalAlign: 'top' }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="lc-badge lc-badge-neutral">{p.brand}</span>
                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCompare(p.product_id))}
                        className="btn btn-sm text-danger p-0"
                      >
                        Remove
                      </button>
                    </div>
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="w-100 rounded mb-2"
                      style={{ height: 130, objectFit: 'cover' }}
                    />
                    <Link
                      to={`/products/${encodeURIComponent(p.product_id)}`}
                      className="fw-semibold d-block mb-1"
                      style={{ fontFamily: 'var(--lc-font-sans)' }}
                    >
                      {p.name}
                    </Link>
                    <PriceTag
                      price={p.price}
                      discountPercent={p.discount_percent}
                      finalPrice={p.final_price}
                      size="sm"
                    />
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Category</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id}>{p.category_name}</td>
                ))}
              </tr>
              <tr>
                <th>Customer Rating</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id}>
                    <RatingStars rating={p.rating_avg} reviewCount={p.review_count} />
                  </td>
                ))}
              </tr>
              <tr>
                <th>Availability</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id}>
                    <StockBadge availableQty={p.available_qty} />
                  </td>
                ))}
              </tr>
              <tr>
                <th>Lens / System Mount</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id}>{p.lens_mount || 'Universal'}</td>
                ))}
              </tr>
              {allSpecKeys.map((specKey) => (
                <tr key={specKey}>
                  <th>{formatSpecLabel(specKey)}</th>
                  {comparedProducts.map((p) => (
                    <td key={p.product_id}>{formatSpecValue(p.specifications?.[specKey])}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Warranty</th>
                {comparedProducts.map((p) => (
                  <td key={p.product_id}>{p.warranty_info}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

