import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, CustomerLayout, ProtectedRoute } from '../components/layout/Layouts';
import { LoadingSpinner } from '../components/common/CommonWidgets';
import { HomePage } from '../pages/customer/HomePage';
import { CataloguePage } from '../pages/customer/CataloguePage';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from '../pages/auth/AuthPages';

const ProductDetailPage = lazy(() =>
  import('../pages/customer/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CartPage = lazy(() =>
  import('../pages/customer/CartWishlistCheckoutPages').then((m) => ({ default: m.CartPage }))
);
const WishlistPage = lazy(() =>
  import('../pages/customer/CartWishlistCheckoutPages').then((m) => ({ default: m.WishlistPage }))
);
const CheckoutPage = lazy(() =>
  import('../pages/customer/CartWishlistCheckoutPages').then((m) => ({ default: m.CheckoutPage }))
);
const MyOrdersPage = lazy(() =>
  import('../pages/customer/OrdersAndProfilePages').then((m) => ({ default: m.MyOrdersPage }))
);
const OrderDetailPage = lazy(() =>
  import('../pages/customer/OrdersAndProfilePages').then((m) => ({ default: m.OrderDetailPage }))
);
const ProfilePage = lazy(() =>
  import('../pages/customer/OrdersAndProfilePages').then((m) => ({ default: m.ProfilePage }))
);
const CompatibilityPage = lazy(() =>
  import('../pages/customer/CompatibilityAndComparisonPages').then((m) => ({
    default: m.CompatibilityPage,
  }))
);
const ComparisonPage = lazy(() =>
  import('../pages/customer/CompatibilityAndComparisonPages').then((m) => ({
    default: m.ComparisonPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardAndAnalyticsPages').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const AdminAnalyticsPage = lazy(() =>
  import('../pages/admin/AdminDashboardAndAnalyticsPages').then((m) => ({
    default: m.AdminAnalyticsPage,
  }))
);
const AdminProductsPage = lazy(() =>
  import('../pages/admin/AdminManagementPages').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminInventoryPage = lazy(() =>
  import('../pages/admin/AdminManagementPages').then((m) => ({ default: m.AdminInventoryPage }))
);
const AdminOrdersPage = lazy(() =>
  import('../pages/admin/AdminManagementPages').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminCustomersPage = lazy(() =>
  import('../pages/admin/AdminManagementPages').then((m) => ({ default: m.AdminCustomersPage }))
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading LensCart studio module..." />}>
      <Routes>
        {/* Customer Storefront Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/compatibility" element={<CompatibilityPage />} />
          <Route path="/compare" element={<ComparisonPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Authenticated Customer Routes */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Protected Administrator Application Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

