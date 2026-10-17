import React, { useState } from 'react';
import type { AuthUser, TeamMember } from '../types/invoice';
import {
  getStoredRegisteredUsers,
  saveStoredRegisteredUsers,
  saveStoredAuthUser,
  recordAuditLog,
  DEFAULT_ADMIN_USER,
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
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  companyName?: string;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => void;
  onAddTeamMember?: (member: TeamMember) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  companyName = 'HIGHPHAUS',
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

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const registered = getStoredRegisteredUsers();
      const account = registered.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.passwordHash === password
      );

      if (account) {
        const user: AuthUser = {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
        };
        saveStoredAuthUser(user);
        recordAuditLog({
          userName: user.name,
          action: 'User Logged In',
          entityType: 'Settings',
          entityId: user.id,
          details: `User ${user.name} (${user.email}) signed into Highphaus workspace.`,
        });
        setIsLoading(false);
        setSuccessMsg(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 400);
      } else {
        // Fallback check: default admin credentials
        if (cleanEmail === DEFAULT_ADMIN_USER.email && (password === 'admin' || password === 'admin123')) {
          saveStoredAuthUser(DEFAULT_ADMIN_USER);
          setIsLoading(false);
          setSuccessMsg(`Welcome, ${DEFAULT_ADMIN_USER.name}!`);
          setTimeout(() => {
            onLoginSuccess(DEFAULT_ADMIN_USER);
            onClose();
          }, 400);
        } else {
          setIsLoading(false);
          setErrorMsg('Invalid email or password. Please verify your credentials or sign up.');
        }
      }
    }, 350);
  };

  const handleQuickAdminLogin = () => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      saveStoredAuthUser(DEFAULT_ADMIN_USER);
      recordAuditLog({
        userName: DEFAULT_ADMIN_USER.name,
        action: 'Quick Admin Login',
        entityType: 'Settings',
        entityId: DEFAULT_ADMIN_USER.id,
        details: 'Admin logged into Highphaus platform via 1-click verification.',
      });
      setIsLoading(false);
      onLoginSuccess(DEFAULT_ADMIN_USER);
      onClose();
    }, 200);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password should be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const registered = getStoredRegisteredUsers();
      const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        setIsLoading(false);
        setErrorMsg('An account with this email already exists. Please sign in instead.');
        return;
      }

      const newUserId = `usr-${Date.now()}`;
      const newAccount = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role,
        passwordHash: password,
      };

      const updatedAccounts = [...registered, newAccount];
      saveStoredRegisteredUsers(updatedAccounts);

      const authUser: AuthUser = {
        id: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role,
      };
      saveStoredAuthUser(authUser);

      // Also register to team roster
      if (onAddTeamMember) {
        onAddTeamMember({
          id: newUserId,
          name: cleanName,
          email: cleanEmail,
          role,
          status: 'active',
          joinedDate: new Date().toISOString().slice(0, 10),
        });
      }

      recordAuditLog({
        userName: authUser.name,
        action: 'User Registered & Joined',
        entityType: 'Settings',
        entityId: authUser.id,
        details: `New team member account created: ${authUser.name} (${authUser.email}) with role ${authUser.role}.`,
      });

      setIsLoading(false);
      setSuccessMsg(`Account created! Welcome to ${companyName}, ${cleanName}.`);
      setTimeout(() => {
        onLoginSuccess(authUser);
        onClose();
      }, 500);
    }, 400);
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
              <span>{errorMsg}</span>
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="current-password"
                  />
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

              {/* Quick 1-click Demo Admin Access */}
              <div
                style={{
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: 'var(--bg-card-light)',
                    fontSize: '0.825rem',
                  }}
                >
                  <Sparkles size={14} color="#f59e0b" />
                  <span>Quick Sign In as Highphaus Admin</span>
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
                    <option value="Owner">Workspace Owner (Full Access)</option>
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
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 600 }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="form-input"
                  />
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
