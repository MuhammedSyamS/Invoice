import React, { useState } from 'react';
import type { AuthUser, TeamMember } from '../types/invoice';
import {
  saveStoredAuthUser,
  recordAuditLog,
} from '../services/storageService';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  companyName?: string;
  isForcedAuth?: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => void;
  onAddTeamMember?: (member: TeamMember) => void;
}

export const formatAuthError = (rawError?: string): string => {
  if (!rawError) return 'An unexpected error occurred. Please try again.';
  const lower = rawError.toLowerCase();
  if (lower.includes('409') || lower.includes('already exists') || lower.includes('already registered')) {
    return 'This email address is already registered. Please sign in or use a different email.';
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('no account')) {
    return 'No account found with this email address. Please check your email or click Create Account below.';
  }
  if (lower.includes('401') || lower.includes('incorrect password') || lower.includes('invalid email or password')) {
    return 'Incorrect password entered. Please check your password and try again.';
  }
  if (lower.includes('403') || lower.includes('pending')) {
    return '⏳ Access Pending: Your account has been registered, but only the Workspace Owner can approve your access. Please wait for the Owner to approve.';
  }
  if (lower.includes('rejected')) {
    return '❌ Access Rejected: Your account request was rejected by the Workspace Owner.';
  }
  if (lower.startsWith('http')) {
    return 'Server communication error. Please try again.';
  }
  return rawError;
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  companyName = 'HIGHPHAUS',
  isForcedAuth = false,
  onClose,
  onLoginSuccess,
  onLogout,
  onAddTeamMember,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AuthUser['role']>('Admin');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate with backend MongoDB User model
      const res = await apiService.loginUser({ email: cleanEmail, password });
      if (res && res.success && res.user) {
        const user: AuthUser = res.user;
        saveStoredAuthUser(user);
        recordAuditLog({
          userName: user.name,
          action: 'User Logged In',
          entityType: 'Settings',
          entityId: user.id,
          details: `User ${user.name} (${user.email}, ${user.role}) signed into ${companyName} workspace.`,
        });
        setIsLoading(false);
        setSuccessMsg(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 350);
        return;
      }

      if (res && (res.status === 'pending' || res.status === 403 && res.error?.toLowerCase().includes('pending'))) {
        setIsLoading(false);
        setErrorMsg('⏳ Access Pending: Your account has been registered, but only the Workspace Owner can approve your access. Please wait for the Owner to approve.');
        return;
      }

      if (res && (res.status === 'rejected' || res.status === 403 && res.error?.toLowerCase().includes('rejected'))) {
        setIsLoading(false);
        setErrorMsg(res.error || '❌ Access Rejected: Your account request was rejected by the Workspace Owner.');
        return;
      }

      if (res && res.error) {
        setIsLoading(false);
        setErrorMsg(formatAuthError(res.error));
        return;
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Unable to connect to the database server. Please check your network connection and try again.');
      return;
    }

    setIsLoading(false);
    setErrorMsg('Authentication failed. Please verify your credentials.');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid work email address (e.g. name@company.com).');
      return;
    }

    if (!password) {
      setErrorMsg('Please create a password for your account.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password is too short. It must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please make sure both password fields are identical.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit registration to backend MongoDB User collection
      const res = await apiService.registerUser({
        name: cleanName,
        email: cleanEmail,
        password,
        role,
      });

      if (res && res.success) {
        const isApproved = res.user?.status === 'approved';

        if (isApproved) {
          const authUser: AuthUser = res.user;
          saveStoredAuthUser(authUser);
          if (onAddTeamMember) {
            onAddTeamMember({
              id: authUser.id,
              name: authUser.name,
              email: authUser.email,
              role: authUser.role,
              status: 'approved',
              joinedDate: new Date().toISOString().slice(0, 10),
            });
          }
          setIsLoading(false);
          setSuccessMsg(`Welcome Workspace Owner, ${cleanName}!`);
          setTimeout(() => {
            onLoginSuccess(authUser);
            onClose();
          }, 500);
          return;
        } else {
          // Status is 'pending' - requires Workspace Owner approval
          setIsLoading(false);
          setSuccessMsg(
            '✅ Account request submitted! Your access is pending Workspace Owner approval. Once approved, you can sign in.'
          );
          setTimeout(() => {
            setMode('login');
          }, 2500);
          return;
        }
      } else if (res && res.error) {
        setIsLoading(false);
        setErrorMsg(formatAuthError(res.error));
        return;
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Unable to connect to the database server. Please check your internet connection and try again.');
      return;
    }

    setIsLoading(false);
    setErrorMsg('Could not complete registration. Please check your network and try again.');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-color)',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
            borderBottom: '1px solid var(--border-color)',
            padding: '1.5rem 1.75rem 1.25rem',
            position: 'relative',
          }}
        >
          {!isForcedAuth && (
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.35rem',
                borderRadius: '50%',
              }}
              aria-label="Close Authentication Modal"
            >
              <X size={16} />
            </button>
          )}

          {isForcedAuth && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Lock size={12} />
              <span>Login Required</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ffffff',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <img src="/favicon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                {companyName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Enterprise Invoice & Billing Platform
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-input)',
              borderRadius: '8px',
              padding: '3px',
              marginTop: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'login' ? 'var(--primary-color, #6366f1)' : 'transparent',
                color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'signup' ? 'var(--primary-color, #6366f1)' : 'transparent',
                color: mode === 'signup' ? '#ffffff' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.5rem 1.75rem' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger, #ef4444)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1rem',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.8rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{formatAuthError(errorMsg)}</span>
              {mode === 'signup' && (errorMsg.includes('already') || errorMsg.includes('409')) && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{
                    background: 'var(--primary-color, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success, #10b981)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1rem',
                color: 'var(--success, #10b981)',
                fontSize: '0.8rem',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@highphaus.com"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showLoginPassword ? 'Hide password' : 'View password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'View password'}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '42px', marginTop: '0.25rem', justifyContent: 'center' }}
              >
                <LogIn size={16} />
                <span>{isLoading ? 'Verifying...' : 'Sign In to Workspace'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color, #6366f1)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Create Account (Sign Up)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Muhammed Syam"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Role & Access Level
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AuthUser['role'])}
                    className="form-select"
                    style={{ paddingLeft: '2.5rem' }}
                  >
                    <option value="Admin">Administrator (Billing & Team)</option>
                    <option value="Accountant">Accountant (Invoices & Expenses)</option>
                    <option value="Viewer">Viewer (Read-Only Reports)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 600 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 chars"
                      className="form-input"
                      style={{ paddingRight: '2.4rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.65rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showSignupPassword ? 'Hide password' : 'View password'}
                      aria-label={showSignupPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showSignupPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 600 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="form-input"
                      style={{ paddingRight: '2.4rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.65rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'View password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '42px', marginTop: '0.25rem', justifyContent: 'center' }}
              >
                <UserPlus size={16} />
                <span>{isLoading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color, #6366f1)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Sign In / Log In
                </button>
              </div>
            </form>
          )}

          {/* Currently Logged In Account Details if any */}
          {currentUser && (
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed in as</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentUser.name} ({currentUser.role})
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setSuccessMsg('Signed out successfully.');
                }}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--danger)' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
