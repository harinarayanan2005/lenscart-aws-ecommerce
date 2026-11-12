import React, { useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Camera,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCart } from '../../store/slices/cartSlice';
import { fetchWishlist } from '../../store/slices/wishlistSlice';
import { logout } from '../../store/slices/authSlice';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { ThemeToggle, ToastContainer } from '../common/CommonWidgets';

export const ProtectedRoute: React.FC<{
  requireAdmin?: boolean;
  children: React.ReactNode;
}> = ({ requireAdmin = false, children }) => {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAppSelector((s) => s.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const CustomerLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <CartDrawer />
      <ToastContainer />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="lc-admin-shell">
      <ToastContainer />
      <aside className="lc-admin-sidebar">
        <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--lc-border-color)' }}>
          <NavLink to="/admin" className="lc-brand-mark" style={{ fontSize: '1.05rem' }}>
            <Camera size={18} />
            <span>LENSCART</span>
            <span className="lc-brand-dot" />
          </NavLink>
          <ThemeToggle />
        </div>

        <div className="small text-uppercase fw-bold mb-2 px-2" style={{ color: 'var(--lc-text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Administration
        </div>

        <nav className="d-flex flex-column gap-1 mb-auto">
          <NavLink to="/admin" end className="lc-nav-link d-flex align-items-center gap-2">
            <LayoutDashboard size={16} /> Overview & KPIs
          </NavLink>
          <NavLink to="/admin/products" className="lc-nav-link d-flex align-items-center gap-2">
            <Package size={16} /> Product Management
          </NavLink>
          <NavLink to="/admin/inventory" className="lc-nav-link d-flex align-items-center gap-2">
            <Boxes size={16} /> Inventory & Stock Logs
          </NavLink>
          <NavLink to="/admin/orders" className="lc-nav-link d-flex align-items-center gap-2">
            <ClipboardList size={16} /> Order Fulfillment
          </NavLink>
          <NavLink to="/admin/customers" className="lc-nav-link d-flex align-items-center gap-2">
            <Users size={16} /> Customer Directory
          </NavLink>
          <NavLink to="/admin/analytics" className="lc-nav-link d-flex align-items-center gap-2">
            <BarChart3 size={16} /> Sales & Reports
          </NavLink>
        </nav>

        <div className="pt-3 border-top mt-4 d-flex flex-column gap-2" style={{ borderColor: 'var(--lc-border-color)' }}>
          <div className="px-2 small">
            <div className="fw-semibold">{user?.name}</div>
            <div style={{ color: 'var(--lc-text-muted)', fontSize: '0.78rem' }}>{user?.email}</div>
          </div>
          <NavLink to="/" className="lc-btn-outline w-100 justify-content-start">
            <Store size={15} /> Return to Storefront
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="lc-btn-outline w-100 justify-content-start text-danger"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--lc-bg-primary)' }}>
        <main className="p-4 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

