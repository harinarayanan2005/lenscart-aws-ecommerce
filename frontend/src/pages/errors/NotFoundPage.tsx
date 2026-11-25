import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container py-5 text-center">
      <div className="lc-card p-5 mx-auto" style={{ maxWidth: 520 }}>
        <Camera size={42} className="mb-3" style={{ color: 'var(--lc-accent-primary)' }} />
        <h2 className="mb-2">404 — Frame Out of Focus</h2>
        <p className="mb-4" style={{ color: 'var(--lc-text-secondary)' }}>
          The equipment page or optical route you requested could not be found in the LensCart catalogue.
        </p>
        <Link to="/" className="lc-btn-primary d-inline-flex align-items-center gap-2">
          <ArrowLeft size={16} /> Return to Storefront
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

