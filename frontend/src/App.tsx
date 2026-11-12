import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, CustomerLayout, ProtectedRoute } from './components/layout/Layouts';
import { HomePage } from './pages/customer/HomePage';
import { CataloguePage } from './pages/customer/CataloguePage';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import {
  CartPage,
  CheckoutPage,
  WishlistPage,
} from './pages/customer/CartWishlistCheckoutPages';
import {
  MyOrdersPage,
  OrderDetailPage,
  ProfilePage,
} from './pages/customer/OrdersAndProfilePages';
import {
  ComparisonPage,
  CompatibilityPage,
} from './pages/customer/CompatibilityAndComparisonPages';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from './pages/auth/AuthPages';
import {
  AdminAnalyticsPage,
  AdminDashboardPage,
} from './pages/admin/AdminDashboardAndAnalyticsPages';
import {
  AdminCustomersPage,
  AdminInventoryPage,
  AdminOrdersPage,
  AdminProductsPage,
} from './pages/admin/AdminManagementPages';

export const AppRoutes: React.FC = () => {
  return (
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
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;

