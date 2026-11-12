import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../src/store';
import { PriceTag, RatingStars, StockBadge, ThemeToggle } from '../src/components/common/CommonWidgets';
import { ProductCard } from '../src/components/products/ProductCard';
import { toggleCompareProduct, clearComparison } from '../src/store/slices/comparisonSlice';
import { formatCurrency, formatSpecLabel } from '../src/utils/formatters';
import type { Product } from '../src/types';

const mockCameraProduct: Product = {
  product_id: 'PROD#cam-sony-a7rv',
  sku: 'SNY-ILCE7RM5',
  name: 'Sony Alpha a7R V Mirrorless Camera Body',
  slug: 'sony-alpha-a7r-v-body',
  brand: 'Sony',
  category_id: 'CAT#cameras',
  category_slug: 'cameras',
  category_name: 'Cameras',
  short_description: '61MP full-frame Exmor R CMOS sensor with AI processing unit.',
  description: 'Professional full-frame mirrorless camera body.',
  price: 3898.0,
  discount_percent: 5,
  final_price: 3703.1,
  images: ['https://example.com/camera.jpg'],
  specifications: {
    sensor_type: '35mm Full-Frame Exmor R CMOS',
    megapixels: 61.0,
    lens_mount: 'Sony E',
  },
  warranty_info: '2-Year Sony Pro Warranty',
  in_the_box: ['Body', 'Battery'],
  compatible_product_ids: [],
  lens_mount: 'Sony E',
  rating_avg: 4.9,
  review_count: 28,
  popularity_score: 980,
  is_featured: true,
  is_new_arrival: false,
  is_best_seller: true,
  catalog_status: 'ACTIVE',
  available_qty: 14,
  low_stock_threshold: 5,
  in_stock: true,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('LensCart Frontend Component & State Suite', () => {
  it('formats currency and technical specification labels accurately', () => {
    expect(formatCurrency(3703.1)).toBe('$3,703.10');
    expect(formatSpecLabel('lens_mount')).toBe('Lens Mount');
    expect(formatSpecLabel('in_body_stabilization')).toBe('In-Body Stabilization (IBIS)');
  });

  it('renders PriceTag with discount percentage and strikethrough retail price', () => {
    render(<PriceTag price={2000} discountPercent={10} finalPrice={1800} />);
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('renders StockBadge for In Stock, Low Stock, and Out of Stock states', () => {
    const { rerender } = render(<StockBadge availableQty={15} lowStockThreshold={5} />);
    expect(screen.getByText(/In Stock \(15\)/i)).toBeInTheDocument();

    rerender(<StockBadge availableQty={3} lowStockThreshold={5} />);
    expect(screen.getByText(/Low Stock \(3 left\)/i)).toBeInTheDocument();

    rerender(<StockBadge availableQty={0} lowStockThreshold={5} />);
    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
  });

  it('toggles theme mode between light and dark and persists attribute on documentElement', () => {
    render(
      <Provider store={store}>
        <ThemeToggle />
      </Provider>
    );
    const btn = screen.getByRole('button');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('renders ProductCard with brand, mount badge, rating stars, and Add to Cart button', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <ProductCard product={mockCameraProduct} />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Sony Alpha a7R V Mirrorless Camera Body')).toBeInTheDocument();
    expect(screen.getByText('Sony E')).toBeInTheDocument();
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
  });

  it('manages product comparison state in Redux slice up to 4 products', () => {
    store.dispatch(clearComparison());
    expect(store.getState().comparison.comparedProducts).toHaveLength(0);

    store.dispatch(toggleCompareProduct(mockCameraProduct));
    expect(store.getState().comparison.comparedProducts).toHaveLength(1);

    // Toggling same product removes it
    store.dispatch(toggleCompareProduct(mockCameraProduct));
    expect(store.getState().comparison.comparedProducts).toHaveLength(0);
  });
});

