import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Camera,
  Heart,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { clearCartState } from '../../store/slices/cartSlice';
import { clearWishlistState } from '../../store/slices/wishlistSlice';
import { addToast, setCartDrawerOpen } from '../../store/slices/uiSlice';
import { ThemeToggle } from '../common/CommonWidgets';

export const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAppSelector((s) => s.auth);
  const cartCount = useAppSelector((s) => s.cart.summary.item_count);
  const wishlistCount = useAppSelector((s) => s.wishlist.items.length);
  const compareCount = useAppSelector((s) => s.comparison.comparedProducts.length);

  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCartState());
    dispatch(clearWishlistState());
    dispatch(addToast({ type: 'info', message: 'You have been signed out.' }));
    navigate('/');
  };

  return (
    <header className="lc-navbar">
      <div className="container py-2">
        <div className="d-flex align-items-center justify-content-between gap-3">
          {/* Brand Logo */}
          <Link to="/" className="lc-brand-mark">
            <Camera size={22} />
            <span>LENSCART</span>
            <span className="lc-brand-dot" title="Precision Optics" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="d-none d-lg-flex align-items-center gap-1">
            <NavLink to="/" end className="lc-nav-link">
              Home
            </NavLink>
            <NavLink to="/catalogue" className="lc-nav-link">
              Catalogue
            </NavLink>
            <NavLink to="/compatibility" className="lc-nav-link d-inline-flex align-items-center gap-1">
              <SlidersHorizontal size={14} /> Mount Finder
            </NavLink>
            <NavLink to="/compare" className="lc-nav-link d-inline-flex align-items-center gap-1">
              <ArrowLeftRight size={14} /> Compare
              {compareCount > 0 && (
                <span className="lc-badge lc-badge-info ms-1">{compareCount}</span>
              )}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className="lc-nav-link d-inline-flex align-items-center gap-1"
                style={{ color: 'var(--lc-accent-primary)' }}
              >
                <ShieldCheck size={15} /> Admin Studio
              </NavLink>
            )}
          </nav>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="d-none d-md-flex align-items-center position-relative"
            style={{ width: '250px' }}
          >
            <input
              type="search"
              className="lc-input pe-4"
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}
              placeholder="Search cameras, lenses, mounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search photography equipment"
            />
            <button
              type="submit"
              className="btn btn-sm position-absolute end-0 me-1 p-1"
              style={{ color: 'var(--lc-text-muted)' }}
              aria-label="Submit search"
            >
              <Search size={15} />
            </button>
          </form>

          {/* Action Icons */}
          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />

            <Link
              to="/wishlist"
              className="lc-btn-outline position-relative"
              style={{ padding: '0.45rem 0.65rem' }}
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart size={16} />
              {wishlistCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                  style={{ backgroundColor: 'var(--lc-accent-primary)', fontSize: '0.65rem' }}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => dispatch(setCartDrawerOpen(true))}
              className="lc-btn-outline position-relative"
              style={{ padding: '0.45rem 0.65rem' }}
              title="Equipment Cart"
              aria-label="Open Cart"
            >
              <ShoppingBag size={16} />
              {cartCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                  style={{ backgroundColor: 'var(--lc-accent-primary)', fontSize: '0.65rem' }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-2">
                <Link
                  to="/profile"
                  className="lc-btn-outline d-none d-sm-inline-flex"
                  style={{ padding: '0.42rem 0.75rem', fontSize: '0.84rem' }}
                >
                  <User size={15} />
                  <span>{user?.name?.split(' ')[0] || 'Account'}</span>
                </Link>
                <Link
                  to="/orders"
                  className="lc-nav-link d-none d-xl-inline-block"
                  style={{ fontSize: '0.84rem' }}
                >
                  My Orders
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="lc-btn-outline"
                  style={{ padding: '0.45rem 0.65rem' }}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="lc-btn-primary" style={{ padding: '0.45rem 0.9rem' }}>
                Sign In
              </Link>
            )}

            <button
              type="button"
              className="lc-btn-outline d-lg-none"
              style={{ padding: '0.45rem 0.6rem' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="d-lg-none pt-3 pb-2 border-top mt-2" style={{ borderColor: 'var(--lc-border-color)' }}>
            <form onSubmit={handleSearch} className="mb-3 d-flex gap-2">
              <input
                type="search"
                className="lc-input"
                placeholder="Search bodies, lenses, lighting..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="lc-btn-primary">
                Search
              </button>
            </form>
            <div className="d-flex flex-column gap-1">
              <NavLink to="/" end className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Home
              </NavLink>
              <NavLink to="/catalogue" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Equipment Catalogue
              </NavLink>
              <NavLink to="/compatibility" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Camera & Lens Mount Compatibility
              </NavLink>
              <NavLink to="/compare" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Side-by-Side Comparison ({compareCount})
              </NavLink>
              {isAuthenticated && (
                <>
                  <NavLink to="/orders" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </NavLink>
                  <NavLink to="/profile" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Profile & Addresses
                  </NavLink>
                </>
              )}
              {isAdmin && (
                <NavLink to="/admin" className="lc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Admin Dashboard
                </NavLink>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

