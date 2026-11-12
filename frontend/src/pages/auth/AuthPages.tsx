import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearAuthError, loginUser, registerUser } from '../../store/slices/authSlice';
import { addToast } from '../../store/slices/uiSlice';
import { authApi, extractErrorMessage } from '../../services/api';
import {
  forgotPasswordSchema,
  LoginFormValues,
  loginSchema,
  RegisterFormValues,
  registerSchema,
  resetPasswordSchema,
} from '../../utils/validation';

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useAppSelector((s) => s.auth);

  const fromPath = (location.state as { from?: string })?.from || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    dispatch(clearAuthError());
    const result = await dispatch(loginUser(values));
    if (loginUser.fulfilled.match(result)) {
      const roles = result.payload.user.roles;
      dispatch(
        addToast({
          type: 'success',
          message: `Welcome back, ${result.payload.user.name}.`,
        })
      );
      if (roles.includes('Admin') && fromPath === '/') {
        navigate('/admin');
      } else {
        navigate(fromPath);
      }
    }
  };

  const fillDemoAccount = (role: 'customer' | 'admin') => {
    if (role === 'admin') {
      setValue('email', 'admin@lenscart.store');
      setValue('password', 'Admin@Lens2026');
    } else {
      setValue('email', 'elena.vance@lenscart.store');
      setValue('password', 'Customer@Lens2026');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-5">
          <div className="lc-card p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="lc-brand-mark justify-content-center mb-2">
                <Camera size={22} />
                <span>LENSCART</span>
                <span className="lc-brand-dot" />
              </div>
              <h3 className="mb-1">Sign In to Your Account</h3>
              <p className="small mb-0" style={{ color: 'var(--lc-text-secondary)' }}>
                Protected by Amazon Cognito User Pools & JWT RBAC
              </p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="mb-3">
                <label className="lc-label" htmlFor="login-email">
                  Email Address
                </label>
                <div className="position-relative">
                  <input
                    id="login-email"
                    type="email"
                    className="lc-input"
                    placeholder="photographer@studio.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <div className="text-danger small mt-1">{errors.email.message}</div>
                )}
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="lc-label mb-1" htmlFor="login-password">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="small"
                    style={{ color: 'var(--lc-accent-primary)', fontSize: '0.8rem' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="lc-input"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <div className="text-danger small mt-1">{errors.password.message}</div>
                )}
              </div>

              <button type="submit" className="lc-btn-primary w-100 mt-2" disabled={loading}>
                <Lock size={15} />
                {loading ? 'Verifying Credentials...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Seeded Account Switcher for Evaluation */}
            <div
              className="mt-4 pt-3 border-top"
              style={{ borderColor: 'var(--lc-border-color)' }}
            >
              <div
                className="small text-uppercase fw-semibold mb-2 text-center"
                style={{ fontSize: '0.72rem', color: 'var(--lc-text-muted)', letterSpacing: '0.06em' }}
              >
                Seeded Evaluation Accounts
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="lc-btn-outline w-50 small"
                  style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                  onClick={() => fillDemoAccount('customer')}
                >
                  <User size={14} /> Customer Demo
                </button>
                <button
                  type="button"
                  className="lc-btn-outline w-50 small"
                  style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                  onClick={() => fillDemoAccount('admin')}
                >
                  <ShieldCheck size={14} /> Admin Demo
                </button>
              </div>
            </div>

            <div className="text-center mt-4 small" style={{ color: 'var(--lc-text-secondary)' }}>
              New to LensCart?{' '}
              <Link to="/register" className="fw-semibold" style={{ color: 'var(--lc-accent-primary)' }}>
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    dispatch(clearAuthError());
    const result = await dispatch(
      registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      })
    );
    if (registerUser.fulfilled.match(result)) {
      dispatch(
        addToast({
          type: 'success',
          message: 'Account created and signed in via Cognito JWT.',
        })
      );
      navigate('/');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="lc-card p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="lc-brand-mark justify-content-center mb-2">
                <Camera size={22} />
                <span>LENSCART</span>
                <span className="lc-brand-dot" />
              </div>
              <h3 className="mb-1">Create Creator Account</h3>
              <p className="small mb-0" style={{ color: 'var(--lc-text-secondary)' }}>
                Save camera mounts, track orders, and manage equipment warranties.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row g-3">
                <div className="col-12">
                  <label className="lc-label" htmlFor="reg-name">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    className="lc-input"
                    placeholder="Elena Vance"
                    {...register('name')}
                  />
                  {errors.name && (
                    <div className="text-danger small mt-1">{errors.name.message}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="lc-label" htmlFor="reg-email">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="lc-input"
                    placeholder="elena@studio.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <div className="text-danger small mt-1">{errors.email.message}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="lc-label" htmlFor="reg-phone">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="lc-input"
                    placeholder="+1 555 234 5678"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <div className="text-danger small mt-1">{errors.phone.message}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="lc-label" htmlFor="reg-password">
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    className="lc-input"
                    placeholder="Min 8 chars, 1 upper, 1 number"
                    {...register('password')}
                  />
                  {errors.password && (
                    <div className="text-danger small mt-1">{errors.password.message}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="lc-label" htmlFor="reg-confirm">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    className="lc-input"
                    placeholder="Repeat password"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <div className="text-danger small mt-1">{errors.confirmPassword.message}</div>
                  )}
                </div>
              </div>

              <button type="submit" className="lc-btn-primary w-100 mt-4" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-4 small" style={{ color: 'var(--lc-text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" className="fw-semibold" style={{ color: 'var(--lc-accent-primary)' }}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [emailForReset, setEmailForReset] = useState('');
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestForm = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const confirmForm = useForm<{
    email: string;
    verification_code: string;
    new_password: string;
  }>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleRequestReset = async (values: { email: string }) => {
    setSubmitting(true);
    try {
      const res = await authApi.requestPasswordReset(values.email);
      setEmailForReset(values.email);
      confirmForm.setValue('email', values.email);
      if (res.reset_code_hint) setCodeHint(res.reset_code_hint);
      setStep('confirm');
      dispatch(addToast({ type: 'info', message: res.message }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (values: {
    email: string;
    verification_code: string;
    new_password: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await authApi.confirmPasswordReset(values);
      dispatch(addToast({ type: 'success', message: res.message }));
      navigate('/login');
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-5">
          <div className="lc-card p-4 p-md-5">
            <div className="text-center mb-4">
              <KeyRound size={28} className="mb-2" />
              <h3 className="mb-1">Password Recovery</h3>
              <p className="small mb-0" style={{ color: 'var(--lc-text-secondary)' }}>
                {step === 'request'
                  ? 'Enter your account email to receive a Cognito verification code.'
                  : `Enter the verification code sent to ${emailForReset}`}
              </p>
            </div>

            {step === 'request' ? (
              <form onSubmit={requestForm.handleSubmit(handleRequestReset)} noValidate>
                <div className="mb-3">
                  <label className="lc-label" htmlFor="fp-email">
                    Account Email
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    className="lc-input"
                    placeholder="photographer@studio.com"
                    {...requestForm.register('email')}
                  />
                  {requestForm.formState.errors.email && (
                    <div className="text-danger small mt-1">
                      {requestForm.formState.errors.email.message}
                    </div>
                  )}
                </div>
                <button type="submit" className="lc-btn-primary w-100" disabled={submitting}>
                  <Mail size={15} /> {submitting ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={confirmForm.handleSubmit(handleConfirmReset)} noValidate>
                {codeHint && (
                  <div className="alert alert-info py-2 small">
                    Local Dev Verification Code: <strong className="lc-mono">{codeHint}</strong>
                  </div>
                )}
                <div className="mb-3">
                  <label className="lc-label">Email</label>
                  <input type="email" className="lc-input" readOnly {...confirmForm.register('email')} />
                </div>
                <div className="mb-3">
                  <label className="lc-label">Verification Code</label>
                  <input
                    type="text"
                    className="lc-input lc-mono"
                    placeholder="6-digit code"
                    {...confirmForm.register('verification_code')}
                  />
                  {confirmForm.formState.errors.verification_code && (
                    <div className="text-danger small mt-1">
                      {confirmForm.formState.errors.verification_code.message}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="lc-label">New Password</label>
                  <input
                    type="password"
                    className="lc-input"
                    placeholder="New strong password"
                    {...confirmForm.register('new_password')}
                  />
                  {confirmForm.formState.errors.new_password && (
                    <div className="text-danger small mt-1">
                      {confirmForm.formState.errors.new_password.message}
                    </div>
                  )}
                </div>
                <button type="submit" className="lc-btn-primary w-100" disabled={submitting}>
                  {submitting ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="text-center mt-4 small">
              <Link to="/login" style={{ color: 'var(--lc-text-secondary)' }}>
                ← Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

