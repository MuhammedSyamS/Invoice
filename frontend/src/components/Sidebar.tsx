import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  Repeat,
  Settings,
  Sun,
  Moon,
  PlusCircle,
  ExternalLink,
  X,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'invoices' | 'quotes' | 'clients' | 'recurring' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onNewInvoice: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  companyName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewInvoice,
  theme,
  toggleTheme,
  companyName,
  isOpen = false,
  onClose,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices' as NavTab, label: 'Invoices & Billing', icon: FileText },
    { id: 'quotes' as NavTab, label: 'Proposals & Quotes', icon: FileCheck },
    { id: 'clients' as NavTab, label: 'Client CRM', icon: Users },
    { id: 'recurring' as NavTab, label: 'Agency Retainers', icon: Repeat },
    { id: 'settings' as NavTab, label: 'Agency Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (onClose) onClose();
  };

  const handleNewInvoiceClick = () => {
    onNewInvoice();
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div>
        {/* Brand Header with Logo Image & Mobile Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#ffffff',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(255, 255, 255, 0.2)',
              }}
            >
              <img
                src="/favicon.png"
                alt="Highphaus Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.04em', color: '#ffffff', margin: 0 }}>
                HIGHPHAUS
              </h1>
              <span style={{ fontSize: '0.625rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CREATIVE MARKETING AGENCY
              </span>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.35rem', background: '#18181b', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Website Link Badge */}
        <a
          href="https://www.highphaus.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            background: '#18181b',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
          }}
        >
          <span>www.highphaus.com</span>
          <ExternalLink size={12} color="#a1a1aa" />
        </a>

        {/* Action Button */}
        <button
          onClick={handleNewInvoiceClick}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '1.5rem', padding: '0.75rem 1rem' }}
        >
          <PlusCircle size={18} />
          <span>Create Invoice</span>
        </button>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : '#a1a1aa',
                  background: isActive ? '#18181b' : 'transparent',
                  borderLeft: isActive ? '3px solid #ffffff' : '3px solid transparent',
                  cursor: 'pointer',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} color={isActive ? '#ffffff' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Theme Switcher */}
      <div>
        <div
          className="card"
          style={{
            padding: '0.85rem',
            background: '#18181b',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 700, letterSpacing: '0.05em' }}>AGENCY PROFILE</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {companyName}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '0.1rem' }}>
            Creative Marketing Agency
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'space-between', padding: '0.6rem 0.85rem' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </span>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Switch
          </span>
        </button>
      </div>
    </aside>
  );
};
