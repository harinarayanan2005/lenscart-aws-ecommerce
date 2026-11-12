import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Cloud, Lock, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      className="mt-auto pt-5 pb-4 border-top"
      style={{
        backgroundColor: 'var(--lc-bg-surface)',
        borderColor: 'var(--lc-border-color)',
      }}
    >
      <div className="container">
        <div className="row g-4 pb-4">
          <div className="col-lg-4">
            <div className="lc-brand-mark mb-3">
              <Camera size={20} />
              <span>LENSCART</span>
              <span className="lc-brand-dot" />
            </div>
            <p className="small mb-3" style={{ color: 'var(--lc-text-secondary)', maxWidth: 340 }}>
              Purveyors of precision mirrorless bodies, cinema optics, carbon support systems, and
              color-accurate studio lighting. Powered by AWS Serverless Architecture.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <span className="lc-badge lc-badge-neutral">
                <ShieldCheck size={12} /> Authorized Dealer Warranty
              </span>
              <span className="lc-badge lc-badge-neutral">
                <Cloud size={12} /> AWS Serverless
              </span>
              <span className="lc-badge lc-badge-neutral">
                <Lock size={12} /> Cognito JWT Secured
              </span>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.06em' }}>
              Categories
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li>
                <Link to="/catalogue?category_id=CAT%23cameras" style={{ color: 'var(--lc-text-secondary)' }}>
                  Mirrorless Cameras
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category_id=CAT%23lenses" style={{ color: 'var(--lc-text-secondary)' }}>
                  Prime & Zoom Lenses
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category_id=CAT%23tripods" style={{ color: 'var(--lc-text-secondary)' }}>
                  Tripods & Stabilizers
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category_id=CAT%23lighting" style={{ color: 'var(--lc-text-secondary)' }}>
                  Studio Lighting
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category_id=CAT%23audio" style={{ color: 'var(--lc-text-secondary)' }}>
                  Pro Audio
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.06em' }}>
              Optical Tools
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li>
                <Link to="/compatibility" style={{ color: 'var(--lc-text-secondary)' }}>
                  Camera & Lens Compatibility Checker
                </Link>
              </li>
              <li>
                <Link to="/compare" style={{ color: 'var(--lc-text-secondary)' }}>
                  Side-by-Side Spec Comparator
                </Link>
              </li>
              <li>
                <Link to="/catalogue?on_sale=true" style={{ color: 'var(--lc-text-secondary)' }}>
                  Special Offers & Rebates
                </Link>
              </li>
              <li>
                <Link to="/catalogue?is_new_arrival=true" style={{ color: 'var(--lc-text-secondary)' }}>
                  New Releases
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-md-4 col-lg-3">
            <h6 className="text-uppercase small fw-bold mb-3" style={{ letterSpacing: '0.06em' }}>
              Customer Care
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li>
                <Link to="/orders" style={{ color: 'var(--lc-text-secondary)' }}>
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/profile" style={{ color: 'var(--lc-text-secondary)' }}>
                  Account & Saved Addresses
                </Link>
              </li>
              <li>
                <Link to="/wishlist" style={{ color: 'var(--lc-text-secondary)' }}>
                  Saved Equipment Wishlist
                </Link>
              </li>
              <li>
                <Link to="/admin" style={{ color: 'var(--lc-text-secondary)' }}>
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-center small"
          style={{ borderColor: 'var(--lc-border-color)', color: 'var(--lc-text-muted)' }}
        >
          <span>© {new Date().getFullYear()} LensCart Photography Store. All rights reserved.</span>
          <span>AWS Free Tier Serverless Architecture · FastAPI · DynamoDB · React</span>
        </div>
      </div>
    </footer>
  );
};

