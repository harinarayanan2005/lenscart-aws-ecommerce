import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Truck,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCategories, fetchProducts } from '../../store/slices/productSlice';
import { ProductCard } from '../../components/products/ProductCard';

export const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: products, categories, loading } = useAppSelector((s) => s.products);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProducts({ page: 1, page_size: 24, sort_by: 'popularity' }));
  }, [dispatch]);

  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 4);
  const bestSellers = products.filter((p) => p.is_best_seller).slice(0, 4);
  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 4);
  const specialOffers = products.filter((p) => p.discount_percent > 0).slice(0, 4);

  return (
    <div>
      {/* Hero Section */}
      <section className="lc-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="d-inline-flex align-items-center gap-2 mb-3">
                <span className="lc-badge lc-badge-danger">PRECISION OPTICS & CINEMA</span>
                <span className="small lc-mono" style={{ color: 'var(--lc-text-muted)' }}>
                  2026 PRO COLLECTION
                </span>
              </div>
              <h1 className="display-5 mb-3" style={{ lineHeight: 1.15 }}>
                Engineered for Every Frame You Envision.
              </h1>
              <p className="lead mb-4" style={{ color: 'var(--lc-text-secondary)', fontSize: '1.08rem' }}>
                Explore full-frame mirrorless bodies, reference prime optics, carbon-fiber support
                systems, and studio lighting—backed by verified mount compatibility and insured
                serverless fulfillment.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/catalogue" className="lc-btn-primary">
                  Explore Equipment <ArrowRight size={16} />
                </Link>
                <Link to="/compatibility" className="lc-btn-outline">
                  <SlidersHorizontal size={16} /> Camera & Lens Mount Finder
                </Link>
              </div>

              <div className="row g-3 mt-4 pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
                <div className="col-4">
                  <div className="fw-bold lc-mono h5 mb-0">8 Categories</div>
                  <div className="small" style={{ color: 'var(--lc-text-muted)' }}>
                    Bodies to Storage
                  </div>
                </div>
                <div className="col-4">
                  <div className="fw-bold lc-mono h5 mb-0">100% Native</div>
                  <div className="small" style={{ color: 'var(--lc-text-muted)' }}>
                    Mount Verification
                  </div>
                </div>
                <div className="col-4">
                  <div className="fw-bold lc-mono h5 mb-0">2-Year Pro</div>
                  <div className="small" style={{ color: 'var(--lc-text-muted)' }}>
                    Authorized Warranty
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="lc-card p-3" style={{ boxShadow: 'var(--lc-shadow-lg)' }}>
                <img
                  src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85"
                  alt="Professional Mirrorless Camera System"
                  className="w-100 rounded"
                  style={{ maxHeight: 390, objectFit: 'cover' }}
                />
                <div className="d-flex justify-content-between align-items-center pt-3 px-1">
                  <div>
                    <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
                      Flagship Spotlight
                    </span>
                    <h6 className="mb-0">Sony Alpha a7R V & FE 24-70mm f/2.8 GM II</h6>
                  </div>
                  <Link to="/products/PROD%23cam-sony-a7rv" className="lc-btn-outline btn-sm">
                    Inspect Specs →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)', letterSpacing: '0.08em' }}>
                Department Directory
              </span>
              <h2 className="mb-0">Equipment Categories</h2>
            </div>
            <Link to="/catalogue" className="small fw-semibold">
              View Complete Catalogue →
            </Link>
          </div>

          <div className="row g-3">
            {categories.map((cat) => (
              <div key={cat.category_id} className="col-6 col-md-4 col-lg-3">
                <Link
                  to={`/catalogue?category_id=${encodeURIComponent(cat.category_id)}`}
                  className="lc-card lc-card-interactive d-block p-3 h-100"
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <Camera size={18} color="var(--lc-accent-primary)" />
                    <span className="lc-badge lc-badge-neutral">{cat.product_count} items</span>
                  </div>
                  <h6 className="mb-1">{cat.name}</h6>
                  <p className="small mb-0" style={{ color: 'var(--lc-text-secondary)', fontSize: '0.8rem' }}>
                    {cat.description}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-5 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
                Curator Selection
              </span>
              <h2 className="mb-0">Featured Reference Gear</h2>
            </div>
            <Link to="/catalogue?featured=true" className="small fw-semibold">
              All Featured →
            </Link>
          </div>

          {loading ? (
            <div className="py-5 text-center">Loading reference photography catalogue...</div>
          ) : (
            <div className="row g-4">
              {featuredProducts.map((p) => (
                <div key={p.product_id} className="col-sm-6 col-lg-3">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Interactive Mount Compatibility & Comparison Banner */}
      <section className="py-5" style={{ backgroundColor: 'var(--lc-bg-secondary)' }}>
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6">
              <div className="lc-card p-4 h-100">
                <span className="lc-badge lc-badge-info mb-2">
                  <Compass size={13} /> Optical Mount Resolver
                </span>
                <h3 className="mb-2">Camera & Lens Compatibility Checker</h3>
                <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                  Select your Sony E, Canon RF, Nikon Z, or Fujifilm X camera body to discover
                  guaranteed native-mount lenses and verified accessories without adapters or guesswork.
                </p>
                <Link to="/compatibility" className="lc-btn-primary">
                  Launch Compatibility Checker <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="lc-card p-4 h-100">
                <span className="lc-badge lc-badge-neutral mb-2">
                  <Sparkles size={13} /> Technical Analysis
                </span>
                <h3 className="mb-2">Side-by-Side Specification Matrix</h3>
                <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)' }}>
                  Compare sensor resolution, dynamic range, autofocus points, minimum focus distance,
                  filter threads, and weight across up to 4 products simultaneously.
                </p>
                <Link to="/compare" className="lc-btn-outline">
                  Open Spec Comparator <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers & New Arrivals */}
      <section className="py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-accent-primary)' }}>
                Proven in the Field
              </span>
              <h2 className="mb-0">Best-Selling Equipment</h2>
            </div>
            <Link to="/catalogue?is_best_seller=true" className="small fw-semibold">
              Explore Best Sellers →
            </Link>
          </div>
          <div className="row g-4 mb-5">
            {bestSellers.map((p) => (
              <div key={p.product_id} className="col-sm-6 col-lg-3">
                <ProductCard product={p} />
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-end mb-4 pt-3 border-top" style={{ borderColor: 'var(--lc-border-color)' }}>
            <div>
              <span className="small text-uppercase fw-bold" style={{ color: 'var(--lc-info)' }}>
                Just Released
              </span>
              <h2 className="mb-0">New Arrivals & Special Offers</h2>
            </div>
            <Link to="/catalogue?on_sale=true" className="small fw-semibold">
              View All Rebates →
            </Link>
          </div>
          <div className="row g-4">
            {[...newArrivals.slice(0, 2), ...specialOffers.slice(0, 2)].map((p) => (
              <div key={p.product_id} className="col-sm-6 col-lg-3">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="py-4 border-top" style={{ borderColor: 'var(--lc-border-color)', backgroundColor: 'var(--lc-bg-subtle)' }}>
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            <div className="col-md-3 d-flex align-items-center gap-3">
              <CheckCircle2 size={24} color="var(--lc-success)" />
              <div>
                <div className="fw-semibold small">Real-Time Stock Lock</div>
                <div className="small" style={{ color: 'var(--lc-text-muted)', fontSize: '0.78rem' }}>
                  DynamoDB Transactional Integrity
                </div>
              </div>
            </div>
            <div className="col-md-3 d-flex align-items-center gap-3">
              <Award size={24} color="var(--lc-accent-primary)" />
              <div>
                <div className="fw-semibold small">Authorized USA Dealer</div>
                <div className="small" style={{ color: 'var(--lc-text-muted)', fontSize: '0.78rem' }}>
                  Full Manufacturer Serial Warranty
                </div>
              </div>
            </div>
            <div className="col-md-3 d-flex align-items-center gap-3">
              <Truck size={24} color="var(--lc-info)" />
              <div>
                <div className="fw-semibold small">Free Insured Courier</div>
                <div className="small" style={{ color: 'var(--lc-text-muted)', fontSize: '0.78rem' }}>
                  Complimentary on orders over $500
                </div>
              </div>
            </div>
            <div className="col-md-3 d-flex align-items-center gap-3">
              <Tag size={24} color="var(--lc-warning)" />
              <div>
                <div className="fw-semibold small">Instant Factory Rebates</div>
                <div className="small" style={{ color: 'var(--lc-text-muted)', fontSize: '0.78rem' }}>
                  Verified Server-Side Pricing
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

